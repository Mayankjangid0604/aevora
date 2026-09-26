import { Test, TestingModule } from '@nestjs/testing';
import { EmployeeService } from './employee.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthorizationService } from '../authorization/authorization.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { EmployeeStatus } from '@prisma/client';

describe('EmployeeService', () => {
  let service: EmployeeService;
  let prisma: PrismaService;
  let auth: AuthorizationService;

  beforeEach(async () => {
    const mockPrisma = {
      $transaction: jest.fn().mockImplementation(async (cb) => cb(mockPrisma)),
      employee: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      department: {
        findUnique: jest.fn(),
      },
      aCWallet: {
        create: jest.fn(),
      },
      employmentHistory: {
        create: jest.fn(),
      },
      companyEvent: {
        create: jest.fn(),
      },
    };

    const mockAuth = {
      checkPermission: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeeService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuthorizationService, useValue: mockAuth },
      ],
    }).compile();

    service = module.get<EmployeeService>(EmployeeService);
    prisma = module.get<PrismaService>(PrismaService);
    auth = module.get<AuthorizationService>(AuthorizationService);
  });

  describe('hireEmployee', () => {
    it('should throw if department does not belong to company', async () => {
      (prisma.department.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'd1', companyId: 'other-company' });
      await expect(service.hireEmployee('actor', 'c1', { name: 'Test', departmentId: 'd1', roleId: 'r1', salary: 100, identitySeed: 'seed', skills: [] }))
        .rejects.toThrow(BadRequestException);
    });

    it('should successfully hire an employee', async () => {
      (prisma.department.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'd1', companyId: 'c1' });
      (prisma.employee.create as jest.Mock).mockResolvedValueOnce({ id: 'e1' });
      
      const res = await service.hireEmployee('actor', 'c1', { name: 'Test', departmentId: 'd1', roleId: 'r1', salary: 100, identitySeed: 'seed', skills: [{name: 'coding', category: 'tech', proficiency: 50}] });
      
      expect(res.id).toBe('e1');
      expect(prisma.aCWallet.create).toHaveBeenCalled();
      expect(prisma.companyEvent.create).toHaveBeenCalled();
    });
  });

  describe('lifecycle', () => {
    it('should terminate employee and create history', async () => {
      (prisma.employee.findUnique as jest.Mock).mockResolvedValue({ id: 'e1', companyId: 'c1', status: EmployeeStatus.ACTIVE });
      (prisma.employee.update as jest.Mock).mockResolvedValueOnce({ id: 'e1', status: EmployeeStatus.TERMINATED });
      
      const res = await service.terminateEmployee('actor', 'e1');
      expect(res.status).toBe(EmployeeStatus.TERMINATED);
      expect(prisma.employmentHistory.create).toHaveBeenCalled();
    });

    it('should reject invalid transition (terminated to on_hold)', async () => {
      (prisma.employee.findUnique as jest.Mock).mockResolvedValue({ id: 'e1', companyId: 'c1', status: EmployeeStatus.TERMINATED });
      await expect(service.holdEmployee('actor', 'e1')).rejects.toThrow(BadRequestException);
    });
  });
});
