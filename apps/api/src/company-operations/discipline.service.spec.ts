import { Test, TestingModule } from '@nestjs/testing';
import { DisciplineService } from './discipline.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { DisciplinarySeverity } from '@prisma/client';

describe('DisciplineService', () => {
  let service: DisciplineService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DisciplineService,
        {
          provide: PrismaService,
          useValue: {
            employee: {
              findUnique: jest.fn(),
            },
            employeeDisciplinaryAction: {
              create: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            companyEvent: {
              create: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<DisciplineService>(DisciplineService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('issueDisciplinaryAction', () => {
    it('should throw an error if employee does not exist or belong to company', async () => {
      (prisma.employee.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.issueDisciplinaryAction('c1', 'u1', 'e1', DisciplinarySeverity.WARNING, 'Reason')
      ).rejects.toThrow(NotFoundException);
    });

    it('should create a disciplinary action and log an event', async () => {
      const mockEmployee = { id: 'e1', companyId: 'c1' };
      const mockAction = { id: 'a1', employeeId: 'e1', issuerId: 'u1', severity: 'WARNING', reason: 'Reason', status: 'ACTIVE' };

      (prisma.employee.findUnique as jest.Mock).mockResolvedValue(mockEmployee);
      (prisma.employeeDisciplinaryAction.create as jest.Mock).mockResolvedValue(mockAction);

      const result = await service.issueDisciplinaryAction('c1', 'u1', 'e1', DisciplinarySeverity.WARNING, 'Reason');

      expect(prisma.employeeDisciplinaryAction.create).toHaveBeenCalledWith({
        data: {
          employeeId: 'e1',
          issuerId: 'u1',
          severity: 'WARNING',
          reason: 'Reason',
          status: 'ACTIVE',
        },
      });

      expect(prisma.companyEvent.create).toHaveBeenCalledWith({
        data: {
          companyId: 'c1',
          type: 'DISCIPLINARY_ACTION_CREATED',
          payload: { actionId: 'a1', employeeId: 'e1', issuerId: 'u1', severity: 'WARNING' },
        },
      });

      expect(result).toEqual(mockAction);
    });
  });

  describe('resolveDisciplinaryAction', () => {
    it('should throw an error if action not found', async () => {
      (prisma.employeeDisciplinaryAction.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.resolveDisciplinaryAction('a1', 'u1')).rejects.toThrow(NotFoundException);
    });

    it('should resolve action and log event', async () => {
      const mockAction = { id: 'a1', employeeId: 'e1', status: 'ACTIVE' };
      const mockUpdated = { ...mockAction, status: 'RESOLVED' };
      const mockEmployee = { id: 'e1', companyId: 'c1' };

      (prisma.employeeDisciplinaryAction.findUnique as jest.Mock).mockResolvedValue(mockAction);
      (prisma.employeeDisciplinaryAction.update as jest.Mock).mockResolvedValue(mockUpdated);
      (prisma.employee.findUnique as jest.Mock).mockResolvedValue(mockEmployee);

      const result = await service.resolveDisciplinaryAction('a1', 'u1');

      expect(prisma.employeeDisciplinaryAction.update).toHaveBeenCalledWith({
        where: { id: 'a1' },
        data: { status: 'RESOLVED' },
      });

      expect(prisma.companyEvent.create).toHaveBeenCalledWith({
        data: {
          companyId: 'c1',
          type: 'DISCIPLINARY_ACTION_RESOLVED',
          payload: { actionId: 'a1', resolverId: 'u1' },
        },
      });

      expect(result).toEqual(mockUpdated);
    });
  });
});
