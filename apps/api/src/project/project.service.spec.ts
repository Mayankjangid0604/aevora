import { Test, TestingModule } from '@nestjs/testing';
import { ProjectService } from './project.service';
import { PrismaService } from '../prisma/prisma.service';
import { ForbiddenException, BadRequestException } from '@nestjs/common';

describe('ProjectService', () => {
  let service: ProjectService;
  let prisma: any;

  beforeEach(async () => {
    const mockPrisma = {
      proposal: {
        findUnique: jest.fn(),
      },
      project: {
        create: jest.fn().mockResolvedValue({ id: 'proj1', companyId: 'co1', name: 'Website Rebuild' }),
        findUnique: jest.fn().mockResolvedValue({ id: 'proj1', tasks: [], client: {} }),
      },
      contract: {
        findFirst: jest.fn().mockResolvedValue({ id: 'contract1', status: 'APPROVED' }),
      }
    };

    const mockExecutionGate = {
      authorizeProductionAction: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: require('../production/production-execution-gate.service').ProductionExecutionGateService, useValue: mockExecutionGate },
      ],
    }).compile();

    service = module.get<ProjectService>(ProjectService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw BadRequestException when proposal not found', async () => {
    (prisma.proposal.findUnique as jest.Mock).mockResolvedValueOnce(null);
    await expect(service.createProjectFromProposal('co1', 'prop1', 'emp1')).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException when proposal not ACCEPTED', async () => {
    (prisma.proposal.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 'prop1',
      status: 'DRAFT',
      approvals: [],
      opportunity: { clientId: 'cl1', title: 'Test' },
      opportunityId: 'opp1',
      scope: 'Full rebuild',
    });
    await expect(service.createProjectFromProposal('co1', 'prop1', 'emp1')).rejects.toThrow(BadRequestException);
  });

  it('should create project from accepted proposal', async () => {
    (prisma.proposal.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 'prop1',
      status: 'ACCEPTED',
      approvals: [{ decision: 'APPROVE' }],
      opportunity: { clientId: 'cl1', title: 'Website Rebuild' },
      opportunityId: 'opp1',
      scope: 'Full rebuild',
    });
    const result = await service.createProjectFromProposal('co1', 'prop1', 'emp1');
    expect(prisma.project.create).toHaveBeenCalled();
    expect(result.id).toBe('proj1');
  });

  it('should get a project with tasks and client', async () => {
    const result = await service.getProject('proj1');
    expect(prisma.project.findUnique).toHaveBeenCalledWith({
      where: { id: 'proj1' },
      include: { tasks: true, client: true },
    });
    expect(result.id).toBe('proj1');
  });
});
