import { Test, TestingModule } from '@nestjs/testing';
import { IntegrationService } from './integration.service';
import { PrismaService } from '../prisma/prisma.service';
import { SandboxEmailProvider } from './providers/sandbox-email.provider';
import { ProductionEmailProvider } from './providers/production-email.provider';
import { StructuredLoggerService } from '../logger/structured-logger.service';
import { ExecutionEnvironment, IntegrationStatus } from '@prisma/client';

describe('IntegrationService', () => {
  let service: IntegrationService;
  let productionEmailProvider: jest.Mocked<ProductionEmailProvider>;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    // Save original env
    process.env = { ...process.env };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntegrationService,
        {
          provide: PrismaService,
          useValue: {
            integrationAuditLog: { create: jest.fn().mockResolvedValue({ id: 'audit-1' }), update: jest.fn() },
            providerIntegration: { findFirst: jest.fn().mockResolvedValue({ id: 'provider-1' }) },
          },
        },
        {
          provide: SandboxEmailProvider,
          useValue: { send: jest.fn().mockResolvedValue({ success: true, message: 'Sandbox ok' }) },
        },
        {
          provide: ProductionEmailProvider,
          useValue: { send: jest.fn().mockResolvedValue({ success: true, message: 'Prod ok' }) },
        },
        {
          provide: StructuredLoggerService,
          useValue: { log: jest.fn(), error: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<IntegrationService>(IntegrationService);
    productionEmailProvider = module.get(ProductionEmailProvider);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Fail-Closed Email Safeguard', () => {
    const payload = { to: 'real-prospect@example.com', subject: 'Test', body: 'Test body' };

    it('A. TEST_EMAIL_RECIPIENT missing -> must throw', async () => {
      delete process.env.ENABLE_REAL_PRODUCTION_SENDING;
      delete process.env.TEST_EMAIL_RECIPIENT;
      await expect(
        service.sendEmail('company-1', ExecutionEnvironment.PRODUCTION, payload, 'actor-1')
      ).rejects.toThrow('TEST_EMAIL_RECIPIENT is missing or empty. The system is in test mode and fails closed to prevent sending real emails.');
      expect(productionEmailProvider.send).not.toHaveBeenCalled();
    });

    it('B. TEST_EMAIL_RECIPIENT empty -> must throw', async () => {
      delete process.env.ENABLE_REAL_PRODUCTION_SENDING;
      process.env.TEST_EMAIL_RECIPIENT = '';
      await expect(
        service.sendEmail('company-1', ExecutionEnvironment.PRODUCTION, payload, 'actor-1')
      ).rejects.toThrow('TEST_EMAIL_RECIPIENT is missing or empty');
      expect(productionEmailProvider.send).not.toHaveBeenCalled();
    });

    it('C. TEST_EMAIL_RECIPIENT whitespace -> must throw', async () => {
      delete process.env.ENABLE_REAL_PRODUCTION_SENDING;
      process.env.TEST_EMAIL_RECIPIENT = '   ';
      await expect(
        service.sendEmail('company-1', ExecutionEnvironment.PRODUCTION, payload, 'actor-1')
      ).rejects.toThrow('TEST_EMAIL_RECIPIENT is missing or empty');
      expect(productionEmailProvider.send).not.toHaveBeenCalled();
    });

    it('D. payload recipient differs from test recipient -> must be redirected to test recipient', async () => {
      delete process.env.ENABLE_REAL_PRODUCTION_SENDING;
      process.env.TEST_EMAIL_RECIPIENT = 'test-override@example.com';
      await service.sendEmail('company-1', ExecutionEnvironment.PRODUCTION, payload, 'actor-1');
      expect(productionEmailProvider.send).toHaveBeenCalledWith({
        ...payload,
        to: 'test-override@example.com' // Overridden
      });
    });

    it('E. payload recipient equals test recipient -> allowed through test provider', async () => {
      delete process.env.ENABLE_REAL_PRODUCTION_SENDING;
      process.env.TEST_EMAIL_RECIPIENT = 'test-override@example.com';
      const exactPayload = { ...payload, to: 'test-override@example.com' };
      await service.sendEmail('company-1', ExecutionEnvironment.PRODUCTION, exactPayload, 'actor-1');
      expect(productionEmailProvider.send).toHaveBeenCalledWith(exactPayload);
    });

    it('Production mode enabled -> allows real sending if flag is true', async () => {
      process.env.ENABLE_REAL_PRODUCTION_SENDING = 'true';
      await service.sendEmail('company-1', ExecutionEnvironment.PRODUCTION, payload, 'actor-1');
      expect(productionEmailProvider.send).toHaveBeenCalledWith(payload);
    });
  });
});
