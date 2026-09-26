import { Test, TestingModule } from '@nestjs/testing';
import { OperationalAlertService } from './operational-alert.service';
import { PrismaService } from '../prisma/prisma.service';

describe('OperationalAlertService', () => {
  let service: OperationalAlertService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const mockPrisma = {
      task: { findMany: jest.fn() },
      projectRisk: { findMany: jest.fn() },
      operationalAlert: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
      companyEvent: { create: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OperationalAlertService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<OperationalAlertService>(OperationalAlertService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should evaluate alerts', async () => {
    (prisma.task.findMany as jest.Mock).mockResolvedValue([
      { id: 't1', title: 'Task 1' }
    ]);
    (prisma.projectRisk.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.operationalAlert.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.operationalAlert.create as jest.Mock).mockResolvedValue({ id: 'a1' });

    await service.evaluateAlerts('c1');

    expect(prisma.operationalAlert.create).toHaveBeenCalled();
  });
});
