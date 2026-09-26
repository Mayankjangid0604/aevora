import { Test, TestingModule } from '@nestjs/testing';
import { ManagementDecisionService } from './management-decision.service';
import { PrismaService } from '../prisma/prisma.service';
import { TaskService } from '../task/task.service';
import { EconomyService } from '../economy/economy.service';
import { ManagementDecisionType, ManagementDecisionStatus } from '@prisma/client';

describe('ManagementDecisionService', () => {
  let service: ManagementDecisionService;
  let prisma: PrismaService;
  let economyService: EconomyService;

  beforeEach(async () => {
    const mockPrisma = {
      managementDecision: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      companyEvent: { create: jest.fn() },
      task: { update: jest.fn() },
      employee: { update: jest.fn() },
      aCWallet: { findUnique: jest.fn() },
    };

    const mockTaskService = {};
    const mockEconomyService = {
      transferAC: jest.fn(),
    };

    const mockDisciplineService = {
      issueDisciplinaryAction: jest.fn(),
    };

    const mockWorkloadService = {
      reassignTask: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ManagementDecisionService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: TaskService, useValue: mockTaskService },
        { provide: EconomyService, useValue: mockEconomyService },
        { provide: require('./discipline.service').DisciplineService, useValue: mockDisciplineService },
        { provide: require('./workload.service').WorkloadService, useValue: mockWorkloadService },
      ],
    }).compile();

    service = module.get<ManagementDecisionService>(ManagementDecisionService);
    prisma = module.get<PrismaService>(PrismaService);
    economyService = module.get<EconomyService>(EconomyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should propose decision', async () => {
    (prisma.managementDecision.create as jest.Mock).mockResolvedValue({ id: 'd1' });

    const result = await service.proposeDecision('c1', 'e1', ManagementDecisionType.BONUS, 'T', 'D');
    expect(result).toBeDefined();
    expect(prisma.managementDecision.create).toHaveBeenCalled();
  });

  it('should approve decision', async () => {
    (prisma.managementDecision.findUnique as jest.Mock).mockResolvedValue({
      id: 'd1',
      status: ManagementDecisionStatus.PROPOSED,
      type: ManagementDecisionType.BONUS,
      companyId: 'c1',
      targetEmployeeId: 't1',
      payload: { amount: 100 },
    });
    
    (prisma.aCWallet.findUnique as jest.Mock).mockResolvedValue({ id: 'w1' });
    (prisma.managementDecision.update as jest.Mock).mockResolvedValue({ id: 'd1', status: 'APPROVED' });

    const result = await service.approveDecision('d1', 'app1', 'c1');
    expect(result.status).toBe('APPROVED');
    expect(economyService.transferAC).toHaveBeenCalled();
  });
});
