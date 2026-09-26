import { Test, TestingModule } from '@nestjs/testing';
import { CompanyService } from './company.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { CompanyStatus } from '@prisma/client';

describe('CompanyService', () => {
  let service: CompanyService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const mockPrisma = {
      $transaction: jest.fn().mockImplementation(async (cb) => cb(mockPrisma)),
      company: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      companyEvent: {
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanyService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CompanyService>(CompanyService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should create a company', async () => {
    (prisma.company.create as jest.Mock).mockResolvedValueOnce({ id: 'c1', name: 'Test' });
    const res = await service.createCompany('Test', 'Test Inc', 'desc', 'chair1');
    expect(res.id).toBe('c1');
    expect(prisma.companyEvent.create).toHaveBeenCalled();
  });

  it('should pause an active company', async () => {
    (prisma.company.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'c1', status: CompanyStatus.ACTIVE });
    (prisma.company.update as jest.Mock).mockResolvedValueOnce({ id: 'c1', status: CompanyStatus.PAUSED });

    const res = await service.pauseCompany('c1');
    expect(res.status).toBe(CompanyStatus.PAUSED);
    expect(prisma.companyEvent.create).toHaveBeenCalled();
  });

  it('should not pause an already paused company', async () => {
    (prisma.company.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'c1', status: CompanyStatus.PAUSED });
    await expect(service.pauseCompany('c1')).rejects.toThrow(BadRequestException);
  });

  it('should close a company', async () => {
    (prisma.company.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'c1', status: CompanyStatus.ACTIVE });
    (prisma.company.update as jest.Mock).mockResolvedValueOnce({ id: 'c1', status: CompanyStatus.CLOSED });
    
    const res = await service.closeCompany('c1');
    expect(res.status).toBe(CompanyStatus.CLOSED);
  });
});
