import { Test, TestingModule } from '@nestjs/testing';
import { WorkCycleService } from './work-cycle.service';
import { AgentContextBuilder } from './agent-context.service';
import { AgentPolicyService } from './agent-policy.service';
import { PrismaService } from '../prisma/prisma.service';
import { TaskService } from '../task/task.service';
import { MemoryService } from './memory.service';
import { ProjectExecutionService } from '../project-execution/project-execution.service';
import { AgentStatus, ExecutionStatus } from '@prisma/client';
import { ManagementDecisionService } from '../company-operations/management-decision.service';
import { TrainingService } from '../company-operations/training.service';
import { MessageService } from '../communication/message.service';
import { MeetingService } from '../communication/meeting.service';
import { ConversationService } from '../communication/conversation.service';
import { IntelligenceSessionService } from '../intelligence/services/intelligence-session.service';
import { PlanningService } from '../intelligence/services/planning.service';
import { DecisionProposalService } from '../intelligence/services/decision-proposal.service';
import { AssistanceRequestService } from '../intelligence/services/assistance-request.service';
import { RiskDetectionService } from '../intelligence/services/risk-detection.service';
import { OutcomeService } from '../intelligence/services/outcome.service';

jest.mock('@aevora/model-gateway', () => {
  return {
    LocalProvider: jest.fn().mockImplementation(() => {
      return {
        generate: jest.fn().mockResolvedValue({
          structuredOutput: {
            actions: [{ type: 'START_MY_TASK', parameters: { taskId: 'mock-task-id' } }]
          }
        })
      };
    })
  };
});

describe('WorkCycleService', () => {
  let service: WorkCycleService;
  let prisma: PrismaService;
  let policy: AgentPolicyService;
  let taskService: TaskService;

  beforeEach(async () => {
    const mockPrisma = {
      agent: { findUnique: jest.fn() },
      agentExecution: { create: jest.fn(), update: jest.fn() },
      task: { update: jest.fn(), findUnique: jest.fn() },
      companyEvent: { create: jest.fn() }
    };
    const mockContext = { buildContext: jest.fn().mockResolvedValue({ systemInstructions: '', contextData: {} }) };
    const mockPolicy = { evaluateAction: jest.fn().mockResolvedValue({ decision: 'ALLOW' }) };
    const mockTask = { startTask: jest.fn(), completeTask: jest.fn() };
    const mockMemory = { createMemory: jest.fn() };
    const mockProjectExecution = {
      createRequirement: jest.fn(),
      createPlan: jest.fn(),
      createMilestone: jest.fn(),
      createRisk: jest.fn(),
      createProjectTask: jest.fn(),
      proposeStaffing: jest.fn(),
      submitTaskForReview: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkCycleService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AgentContextBuilder, useValue: mockContext },
        { provide: AgentPolicyService, useValue: mockPolicy },
        { provide: TaskService, useValue: mockTask },
        { provide: MemoryService, useValue: mockMemory },
        { provide: ProjectExecutionService, useValue: mockProjectExecution },
        { provide: ManagementDecisionService, useValue: {} },
        { provide: TrainingService, useValue: {} },
        // Phase 6C+ services (communication, intelligence)
        { provide: MessageService, useValue: { sendMessage: jest.fn() } },
        { provide: MeetingService, useValue: { scheduleMeeting: jest.fn() } },
        { provide: ConversationService, useValue: { createConversation: jest.fn() } },
        { provide: IntelligenceSessionService, useValue: { createSession: jest.fn() } },
        { provide: PlanningService, useValue: { createPlan: jest.fn() } },
        { provide: DecisionProposalService, useValue: { createProposal: jest.fn() } },
        { provide: AssistanceRequestService, useValue: { createRequest: jest.fn() } },
        { provide: RiskDetectionService, useValue: { detectRisks: jest.fn() } },
        { provide: OutcomeService, useValue: { recordOutcome: jest.fn() } },
      ],
    }).compile();

    service = module.get(WorkCycleService);
    prisma = module.get(PrismaService);
    policy = module.get(AgentPolicyService);
    taskService = module.get(TaskService);
  });

  it('should execute work cycle and start task', async () => {
    (prisma.agent.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 'a1', status: AgentStatus.ACTIVE, employeeId: 'e1', configuration: { model: 'local-stub' }, employee: { id: 'e1', companyId: 'c1' }
    });
    (prisma.agentExecution.create as jest.Mock).mockResolvedValueOnce({ id: 'exec1' });
    (prisma.agentExecution.update as jest.Mock).mockResolvedValue({ id: 'exec1', status: ExecutionStatus.COMPLETED });

    const res = await service.runWorkCycle('a1');
    expect(res.accepted[0].type).toBe('START_MY_TASK');
    expect(taskService.startTask).toHaveBeenCalledWith('mock-task-id', 'e1');
  });
});
