import { Test, TestingModule } from '@nestjs/testing';
import { CompanyMetricsService } from './company-metrics.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CompanyMetricsService', () => {
  let service: CompanyMetricsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const mockPrisma = {
      employee: { count: jest.fn() },
      project: { count: jest.fn() },
      task: { count: jest.fn() },
      projectRisk: { count: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanyMetricsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CompanyMetricsService>(CompanyMetricsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should get company metrics', async () => {
    (prisma.employee.count as jest.Mock).mockResolvedValue(10);
    (prisma.project.count as jest.Mock).mockResolvedValue(2);
    (prisma.task.count as jest.Mock).mockResolvedValue(5);
    (prisma.projectRisk.count as jest.Mock).mockResolvedValue(1);

    const metrics = await service.getCompanyMetrics('company-1');
    expect(metrics.activeEmployees).toBe(10);
    expect(metrics.activeProjects).toBe(2);
  });
});
