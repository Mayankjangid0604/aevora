import { Test, TestingModule } from '@nestjs/testing';
import { ClientService } from './client.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ClientService', () => {
  let service: ClientService;
  let prisma: any;

  beforeEach(async () => {
    const mockPrisma = {
      client: {
        create: jest.fn().mockResolvedValue({ id: 'c1', name: 'Acme Corp', companyId: 'co1' }),
        findUnique: jest.fn().mockResolvedValue({ id: 'c1', name: 'Acme Corp', contacts: [], inquiries: [], opportunities: [], projects: [] }),
        findMany: jest.fn().mockResolvedValue([{ id: 'c1', name: 'Acme Corp' }]),
      },
      clientContact: {
        create: jest.fn().mockResolvedValue({ id: 'cc1', clientId: 'c1', name: 'John Doe' }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ClientService>(ClientService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a client', async () => {
    const result = await service.createClient('co1', { name: 'Acme Corp' });
    expect(prisma.client.create).toHaveBeenCalled();
    expect(result.id).toBe('c1');
  });

  it('should get a client with relations', async () => {
    const result = await service.getClient('c1');
    expect(prisma.client.findUnique).toHaveBeenCalledWith({
      where: { id: 'c1' },
      include: { contacts: true, inquiries: true, opportunities: true, projects: true },
    });
    expect(result.id).toBe('c1');
  });

  it('should list clients by company', async () => {
    const result = await service.listClients('co1');
    expect(prisma.client.findMany).toHaveBeenCalledWith({ where: { companyId: 'co1' } });
    expect(result.length).toBeGreaterThan(0);
  });

  it('should add a contact to a client', async () => {
    const result = await service.addContact('c1', { name: 'John Doe', email: 'john@acme.com' });
    expect(prisma.clientContact.create).toHaveBeenCalled();
    expect(result.clientId).toBe('c1');
  });
});
