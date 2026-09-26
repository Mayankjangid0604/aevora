import { Test, TestingModule } from '@nestjs/testing';
import { WorkloadService } from './workload.service';
import { PrismaService } from '../prisma/prisma.service';
import { TaskStatus, TaskPriority } from '@prisma/client';

describe('WorkloadService', () => {
  let service: WorkloadService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const mockPrisma = {
      task: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [WorkloadService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<WorkloadService>(WorkloadService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should calculate workload correctly', async () => {
    (prisma.task.findMany as jest.Mock).mockResolvedValue([
      { id: 't1', status: TaskStatus.READY, priority: TaskPriority.NORMAL, estimatedEffort: 5 },
      { id: 't2', status: TaskStatus.IN_PROGRESS, priority: TaskPriority.URGENT, estimatedEffort: 10 }
    ]);

    const res = await service.calculateEmployeeWorkload('emp1');
    expect(res.activeTasks).toBe(2);
    expect(res.urgentTasks).toBe(1);
    expect(res.estimatedWorkload).toBe(15);
    expect(res.utilization).toBe(75); // (15 / 20) * 100
  });
});
