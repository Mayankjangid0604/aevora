import { Test, TestingModule } from '@nestjs/testing';
import { OpportunityAssessmentService } from './opportunity-assessment.service';
import { PrismaService } from '../prisma/prisma.service';
import { OpportunityService } from '../opportunity/opportunity.service';

describe('OpportunityAssessmentService', () => {
  let service: OpportunityAssessmentService;
  let prisma: any;
  let opportunityService: any;

  beforeEach(async () => {
    const mockPrisma = {
      opportunity: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'opp1',
          inquiry: { budget: 150000 },
        }),
      },
    };

    const mockOpportunityService = {
      updateOpportunityAssessments: jest.fn().mockResolvedValue({
        id: 'opp1',
        estimatedCost: 80000,
        estimatedProfit: 70000,
        expectedDuration: 60,
        confidence: 90,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpportunityAssessmentService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: OpportunityService, useValue: mockOpportunityService },
      ],
    }).compile();

    service = module.get<OpportunityAssessmentService>(OpportunityAssessmentService);
    prisma = module.get<PrismaService>(PrismaService);
    opportunityService = module.get<OpportunityService>(OpportunityService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should assess an opportunity and update assessments', async () => {
    const result = await service.assessOpportunity('opp1');
    expect(prisma.opportunity.findUnique).toHaveBeenCalledWith({
      where: { id: 'opp1' },
      include: { inquiry: true },
    });
    expect(opportunityService.updateOpportunityAssessments).toHaveBeenCalled();
    expect(result.estimatedCost).toBe(80000);
  });

  it('should throw if opportunity or inquiry not found', async () => {
    (prisma.opportunity.findUnique as jest.Mock).mockResolvedValueOnce(null);
    await expect(service.assessOpportunity('missing')).rejects.toThrow('Opportunity or Inquiry not found');
  });
});
