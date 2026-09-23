import { Test, TestingModule } from '@nestjs/testing';
import { TaskService } from './task.service';
import { PrismaService } from '../prisma/prisma.service';
import { ModelOrchestratorService } from '../research/services/model-orchestrator.service';
import { BadRequestException } from '@nestjs/common';
import { TaskStatus } from '@prisma/client';

describe('TaskService', () => {
  let service: TaskService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const mockPrisma = {
      task: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      taskDependency: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      companyEvent: {
        create: jest.fn(),
      },
      employee: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation((cb) => cb(mockPrisma)),
    };

    const mockModelOrchestrator = {
      invokeModel: jest.fn(),
      selectBestModel: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskService, 
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ModelOrchestratorService, useValue: mockModelOrchestrator }
      ],
    }).compile();

    service = module.get<TaskService>(TaskService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should create task without dependencies as READY', async () => {
    (prisma.task.create as jest.Mock).mockResolvedValue({ id: 't1', title: 'Task 1', status: TaskStatus.READY });
    const res = await service.createTask({ companyId: 'c1', createdBy: 'sys', title: 'Task 1' });
    expect(res.status).toBe(TaskStatus.READY);
  });

  it('should create task with dependencies as BACKLOG', async () => {
    (prisma.task.create as jest.Mock).mockResolvedValue({ id: 't2', title: 'Task 2', status: TaskStatus.BACKLOG });
    (prisma.task.findUnique as jest.Mock).mockResolvedValue({ id: 't1', companyId: 'c1' });
    const res = await service.createTask({ companyId: 'c1', createdBy: 'sys', title: 'Task 2', dependencies: ['t1'] });
    expect(res.status).toBe(TaskStatus.BACKLOG);
  });

  it('should prevent self-dependency', async () => {
    (prisma.task.create as jest.Mock).mockResolvedValue({ id: 't1', title: 'Task 1', status: TaskStatus.BACKLOG });
    await expect(service.createTask({ companyId: 'c1', createdBy: 'sys', title: 'Task 1', dependencies: ['t1'] }))
      .rejects.toThrow(BadRequestException);
  });

  it('should block starting task if dependencies not completed', async () => {
    (prisma.task.findUnique as jest.Mock)
      .mockResolvedValueOnce({ id: 't2', status: TaskStatus.READY, dependencies: [{ dependsOnId: 't1' }] })
      .mockResolvedValueOnce({ id: 't1', status: TaskStatus.IN_PROGRESS });

    await expect(service.startTask('t2', 'sys')).rejects.toThrow(BadRequestException);
  });
});
