import { Test, TestingModule } from '@nestjs/testing';
import { EconomyService } from './economy.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';

describe('EconomyService', () => {
  let service: EconomyService;
  let prisma: PrismaService;

  beforeEach(async () => {
    // We create a mock Prisma module for the tests
    // so we don't depend on a live DB for the unit tests,
    // though e2e tests would require a live DB.
    
    // We mock $transaction to simply execute the callback
    const mockPrisma = {
      $transaction: jest.fn().mockImplementation(async (cb) => cb(mockPrisma)),
      $executeRaw: jest.fn().mockResolvedValue(1),
      aCWallet: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      aCTransaction: {
        create: jest.fn(),
        findUnique: jest.fn(),
      },
      realMoneyAccount: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      realMoneyTransaction: {
        create: jest.fn(),
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EconomyService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<EconomyService>(EconomyService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('transferAC', () => {
    it('should throw if amount is negative', async () => {
      await expect(service.transferAC('w1', 'w2', -100, 'test')).rejects.toThrow(BadRequestException);
    });

    it('should throw if amount is zero', async () => {
      await expect(service.transferAC('w1', 'w2', 0, 'test')).rejects.toThrow(BadRequestException);
    });

    it('should throw if amount is float', async () => {
      await expect(service.transferAC('w1', 'w2', 10.5, 'test')).rejects.toThrow(BadRequestException);
    });

    it('should throw if source and destination are the same', async () => {
      await expect(service.transferAC('w1', 'w1', 100, 'test')).rejects.toThrow(BadRequestException);
    });

    it('should throw if source wallet has insufficient balance', async () => {
      (prisma.$executeRaw as jest.Mock).mockResolvedValueOnce(0); // Source update fails
      
      await expect(service.transferAC('w1', 'w2', 100, 'test')).rejects.toThrow('Insufficient funds');
    });

    it('should process transfer successfully', async () => {
      // Mock both raw updates to succeed
      (prisma.$executeRaw as jest.Mock).mockResolvedValue(1);

      (prisma.aCTransaction.create as jest.Mock).mockResolvedValueOnce({ id: 't1' });

      const res = await service.transferAC('w1', 'w2', 100, 'test');
      
      expect(prisma.$executeRaw).toHaveBeenCalledTimes(2);
      expect(prisma.aCTransaction.create).toHaveBeenCalledTimes(1);
      expect(res.id).toBe('t1');
    });

    it('should return existing transaction if idempotencyKey matches', async () => {
      (prisma.aCTransaction.findUnique as jest.Mock).mockResolvedValueOnce({ id: 't-existing' });
      const res = await service.transferAC('w1', 'w2', 100, 'test', 'idemp-key');
      expect(res.id).toBe('t-existing');
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('transferRealMoney', () => {
    it('should process real money transfer successfully', async () => {
      (prisma.$executeRaw as jest.Mock).mockResolvedValue(1);

      (prisma.realMoneyTransaction.create as jest.Mock).mockResolvedValueOnce({ id: 'rt1' });

      const res = await service.transferRealMoney('r1', 'r2', 500, 'test desc');
      expect(prisma.$executeRaw).toHaveBeenCalledTimes(2);
      expect(prisma.realMoneyTransaction.create).toHaveBeenCalledTimes(2); // One debit, one credit
      expect(res.id).toBe('rt1');
    });
  });
});
