import { Test, TestingModule } from '@nestjs/testing';
import { OpportunityService } from './opportunity.service';
import { PrismaService } from '../prisma/prisma.service';

describe('OpportunityService', () => {
  let service: OpportunityService;
  let prisma: any;

  beforeEach(async () => {
    const mockPrisma = {
      opportunity: {
        create: jest.fn().mockResolvedValue({ id: 'opp1', companyId: 'co1', clientId: 'cl1', title: 'Website Rebuild' }),
        findUnique: jest.fn().mockResolvedValue({ id: 'opp1', proposals: [], client: {}, inquiry: {} }),
        findMany: jest.fn().mockResolvedValue([{ id: 'opp1' }]),
        update: jest.fn().mockResolvedValue({ id: 'opp1', status: 'QUALIFYING' }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpportunityService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<OpportunityService>(OpportunityService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create an opportunity', async () => {
    const result = await service.createOpportunity('co1', 'cl1', { title: 'Website Rebuild' });
    expect(prisma.opportunity.create).toHaveBeenCalled();
    expect(result.id).toBe('opp1');
  });

  it('should get an opportunity with relations', async () => {
    const result = await service.getOpportunity('opp1');
    expect(prisma.opportunity.findUnique).toHaveBeenCalledWith({
      where: { id: 'opp1' },
      include: { proposals: true, client: true, inquiry: true },
    });
    expect(result.id).toBe('opp1');
  });

  it('should list opportunities by company', async () => {
    const result = await service.listOpportunities('co1');
    expect(prisma.opportunity.findMany).toHaveBeenCalledWith({ where: { companyId: 'co1' } });
    expect(result.length).toBeGreaterThan(0);
  });

  it('should update opportunity status to QUALIFYING', async () => {
    const result = await service.updateOpportunityStatus('opp1', 'QUALIFYING');
    expect(prisma.opportunity.update).toHaveBeenCalled();
    expect(result.status).toBe('QUALIFYING');
  });

  it('should update opportunity assessments', async () => {
    const assessments = { estimatedCost: 80000, estimatedProfit: 20000, expectedDuration: 60, confidence: 90 };
    await service.updateOpportunityAssessments('opp1', assessments);
    expect(prisma.opportunity.update).toHaveBeenCalledWith({ where: { id: 'opp1' }, data: assessments });
  });
});
