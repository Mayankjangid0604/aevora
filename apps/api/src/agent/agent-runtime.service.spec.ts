import { Test, TestingModule } from '@nestjs/testing';
import { AgentRuntimeService } from './agent-runtime.service';
import { AgentContextBuilder } from './agent-context.service';
import { AgentPolicyService } from './agent-policy.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { AgentStatus, ExecutionStatus } from '@prisma/client';

jest.mock('@aevora/model-gateway', () => {
  return {
    LocalProvider: jest.fn().mockImplementation(() => {
      return {
        generate: jest.fn().mockResolvedValue({
          structuredOutput: {
            actions: [{ type: 'VIEW_COMPANY', parameters: {} }]
          }
        })
      };
    })
  };
});

describe('AgentRuntimeService', () => {
  let service: AgentRuntimeService;
  let prisma: PrismaService;
  let policy: AgentPolicyService;

  beforeEach(async () => {
    const mockPrisma = {
      agent: {
        findUnique: jest.fn(),
      },
      agentExecution: {
        create: jest.fn(),
        update: jest.fn(),
      }
    };

    const mockContext = {
      buildContext: jest.fn().mockResolvedValue({ systemInstructions: '' })
    };

    const mockPolicy = {
      evaluateAction: jest.fn().mockResolvedValue({ decision: 'ALLOW' })
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentRuntimeService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AgentContextBuilder, useValue: mockContext },
        { provide: AgentPolicyService, useValue: mockPolicy },
      ],
    }).compile();

    service = module.get<AgentRuntimeService>(AgentRuntimeService);
    prisma = module.get<PrismaService>(PrismaService);
    policy = module.get<AgentPolicyService>(AgentPolicyService);
  });

  it('should throw if agent not active', async () => {
    (prisma.agent.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'a1', status: AgentStatus.PAUSED });
    await expect(service.runAgent('a1')).rejects.toThrow(BadRequestException);
  });

  it('should execute successfully and record execution', async () => {
    (prisma.agent.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 'a1', status: AgentStatus.ACTIVE, employeeId: 'e1', employee: { companyId: 'c1' }
    });
    (prisma.agentExecution.create as jest.Mock).mockResolvedValueOnce({ id: 'exec1' });
    (prisma.agentExecution.update as jest.Mock).mockResolvedValueOnce({ id: 'exec1', status: ExecutionStatus.COMPLETED });

    const res = await service.runAgent('a1');
    expect(res.status).toBe(ExecutionStatus.COMPLETED);
    expect(prisma.agentExecution.update).toHaveBeenCalled();
    expect(policy.evaluateAction).toHaveBeenCalledWith('e1', 'c1', 'VIEW_COMPANY', {});
  });
});
