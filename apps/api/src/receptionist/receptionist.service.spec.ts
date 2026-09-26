import { Test, TestingModule } from '@nestjs/testing';
import { ReceptionistService } from './receptionist.service';
import { PrismaService } from '../prisma/prisma.service';
import { AgentRuntimeService } from '../agent/agent-runtime.service';

describe('ReceptionistService', () => {
  let service: ReceptionistService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReceptionistService,
        { provide: PrismaService, useValue: {} },
        { provide: AgentRuntimeService, useValue: {} },
      ],
    }).compile();

    service = module.get<ReceptionistService>(ReceptionistService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
