import { Test, TestingModule } from '@nestjs/testing';
import { InquiryService } from './inquiry.service';
import { PrismaService } from '../prisma/prisma.service';

describe('InquiryService', () => {
  let service: InquiryService;
  let prisma: any;

  beforeEach(async () => {
    const mockPrisma = {
      clientInquiry: {
        create: jest.fn().mockResolvedValue({ id: 'iq1', companyId: 'co1', title: 'New Inquiry', status: 'NEW' }),
        findUnique: jest.fn().mockResolvedValue({ id: 'iq1', title: 'New Inquiry', client: null }),
        findMany: jest.fn().mockResolvedValue([{ id: 'iq1', title: 'New Inquiry' }]),
        update: jest.fn().mockResolvedValue({ id: 'iq1', status: 'QUALIFIED' }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InquiryService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<InquiryService>(InquiryService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create an inquiry', async () => {
    const result = await service.createInquiry('co1', null, { title: 'New Inquiry', description: 'We need a web app' });
    expect(prisma.clientInquiry.create).toHaveBeenCalled();
    expect(result.id).toBe('iq1');
  });

  it('should get an inquiry', async () => {
    const result = await service.getInquiry('iq1');
    expect(prisma.clientInquiry.findUnique).toHaveBeenCalledWith({ where: { id: 'iq1' }, include: { client: true } });
    expect(result.id).toBe('iq1');
  });

  it('should list inquiries for a company', async () => {
    const result = await service.listInquiries('co1');
    expect(prisma.clientInquiry.findMany).toHaveBeenCalledWith({ where: { companyId: 'co1' } });
    expect(result.length).toBeGreaterThan(0);
  });

  it('should update inquiry status', async () => {
    const result = await service.updateInquiryStatus('iq1', 'QUALIFIED');
    expect(prisma.clientInquiry.update).toHaveBeenCalled();
    expect(result.status).toBe('QUALIFIED');
  });
});
