import { Test, TestingModule } from '@nestjs/testing';
import { ProposalService } from './proposal.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProductionExecutionGateService } from '../production/production-execution-gate.service';
import { ApprovalValidationService } from '../approval/approval-validation.service';
import { ForbiddenException, BadRequestException } from '@nestjs/common';

describe('ProposalService', () => {
  let service: ProposalService;
  let prisma: any;
  let gate: any;
  let approvalValidation: any;

  beforeEach(async () => {
    const mockPrisma = {
      opportunity: {
        findUnique: jest.fn().mockResolvedValue({ id: 'opp1', clientId: 'cli1' }),
      },
      proposal: {
        create: jest.fn().mockResolvedValue({ id: 'p1', opportunityId: 'opp1', proposedPrice: 100000 }),
        findUnique: jest.fn().mockResolvedValue({ 
          id: 'p1', 
          status: 'DRAFT',
          title: 'Test',
          lineItems: [],
          quantity: 1,
          unitPrice: 100,
          currency: 'USD',
          tax: 0,
          total: 100,
          customerId: 'cli1',
          opportunity: {}, 
          approvals: [] 
        }),
        update: jest.fn().mockResolvedValue({ id: 'p1', status: 'ACCEPTED' }),
      },
      proposalApproval: {
        create: jest.fn().mockResolvedValue({ id: 'pa1', proposalId: 'p1', decision: 'APPROVE' }),
      },
    };

    const mockGate = {
      authorizeProductionAction: jest.fn().mockResolvedValue(true)
    };

    const mockApprovalValidation = {
      validateAndConsumeApproval: jest.fn().mockResolvedValue(true)
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProposalService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ProductionExecutionGateService, useValue: mockGate },
        { provide: ApprovalValidationService, useValue: mockApprovalValidation },
      ],
    }).compile();

    service = module.get<ProposalService>(ProposalService);
    prisma = module.get<PrismaService>(PrismaService);
    gate = module.get<ProductionExecutionGateService>(ProductionExecutionGateService);
    approvalValidation = module.get<ApprovalValidationService>(ApprovalValidationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a proposal', async () => {
    const result = await service.createProposal('opp1', { scope: 'Full rebuild', deliverables: 'API + Frontend', proposedPrice: 100000 });
    expect(prisma.proposal.create).toHaveBeenCalled();
    expect(result.id).toBe('p1');
  });

  it('should get a proposal with relations', async () => {
    const result = await service.getProposal('p1');
    expect(prisma.proposal.findUnique).toHaveBeenCalledWith({
      where: { id: 'p1' },
      include: { opportunity: true, approvals: true, customer: true },
    });
    expect(result.id).toBe('p1');
  });

  it('should update proposal status', async () => {
    const result = await service.updateProposalStatus('p1', 'ACCEPTED');
    expect(prisma.proposal.update).toHaveBeenCalled();
    expect(result.status).toBe('ACCEPTED');
  });

  it('should approve a proposal using execution gate and parameter binding', async () => {
    const result = await service.approveProposal('p1', 'emp1', 'comp1', 'app1');
    
    expect(gate.authorizeProductionAction).toHaveBeenCalled();
    expect(prisma.proposalApproval.create).toHaveBeenCalledWith({
      data: { proposalId: 'p1', actorId: 'emp1', decision: 'APPROVE' },
    });
    expect(result.status).toBe('ACCEPTED');
  });
});
