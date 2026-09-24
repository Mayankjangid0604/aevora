import { Test, TestingModule } from '@nestjs/testing';
import { ProjectExecutionService } from './project-execution.service';
import { PrismaService } from '../prisma/prisma.service';
import { TaskService } from '../task/task.service';
import { KnowledgeExtractionService } from '../knowledge/knowledge-extraction.service';

describe('ProjectExecutionService', () => {
  let service: ProjectExecutionService;

  beforeEach(async () => {
    const mockPrisma = {
      project: { findUnique: jest.fn() },
      projectRequirement: { findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
      projectPlan: { findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
      projectMilestone: { findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
      projectRisk: { findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
      projectAssignment: { findMany: jest.fn(), create: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
      projectDelivery: { findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
      taskReview: { create: jest.fn() },
      task: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      employee: { findUnique: jest.fn() },
      companyEvent: { create: jest.fn() },
    };
    const mockTaskService = {
      createTask: jest.fn(),
      completeTask: jest.fn(),
    };
    const mockKnowledgeExtraction = {
      proposeKnowledgeFromSource: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectExecutionService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: TaskService, useValue: mockTaskService },
        { provide: KnowledgeExtractionService, useValue: mockKnowledgeExtraction },
      ],
    }).compile();

    service = module.get<ProjectExecutionService>(ProjectExecutionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
