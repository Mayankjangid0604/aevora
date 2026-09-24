import { Test, TestingModule } from '@nestjs/testing';
import { AgentPolicyService } from './agent-policy.service';
import { PrismaService } from '../prisma/prisma.service';
import { AgentActionRegistry } from './agent.registry';

describe('AgentPolicyService', () => {
  let service: AgentPolicyService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const mockPrisma = {
      employee: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentPolicyService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AgentPolicyService>(AgentPolicyService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should deny unknown actions', async () => {
    const res = await service.evaluateAction('emp1', 'comp1', 'HACK_SYSTEM', {});
    expect(res.decision).toBe('DENY');
    expect(res.reason).toContain('Unknown action type');
  });

  it('should deny if employee lacks permission', async () => {
    (prisma.employee.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 'emp1',
      companyId: 'comp1',
      role: { permissions: ['VIEW_COMPANY'] }
    });

    const res = await service.evaluateAction('emp1', 'comp1', 'UPDATE_EMPLOYEE_SKILL', {});
    expect(res.decision).toBe('DENY');
    expect(res.reason).toContain('lacks required permission');
  });

  it('should allow if employee has permission', async () => {
    (prisma.employee.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 'emp1',
      companyId: 'comp1',
      role: { permissions: ['MANAGE_EMPLOYEES'] }
    });

    const res = await service.evaluateAction('emp1', 'comp1', 'UPDATE_EMPLOYEE_SKILL', {});
    expect(res.decision).toBe('ALLOW');
  });

  it('should deny cross-company parameters', async () => {
    (prisma.employee.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 'emp1',
      companyId: 'comp1',
      role: { permissions: ['VIEW_COMPANY'] }
    });

    const res = await service.evaluateAction('emp1', 'comp1', 'VIEW_COMPANY', { companyId: 'comp2' });
    expect(res.decision).toBe('DENY');
    expect(res.reason).toContain('Cross-company');
  });

  it('should deny when sessionId belongs to a different company', async () => {
    (prisma.employee.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 'emp1',
      companyId: 'comp1',
      role: { permissions: ['MANAGE_INTELLIGENCE'] }
    });
    // Return a session from a different company
    (prisma.intelligenceSession as any) = {
      findUnique: jest.fn().mockResolvedValueOnce({ id: 'sess1', companyId: 'comp2' })
    };

    const res = await service.evaluateAction('emp1', 'comp1', 'START_INTELLIGENCE_SESSION', { sessionId: 'sess1' });
    expect(res.decision).toBe('DENY');
    expect(res.reason).toContain('different company');
  });
});
