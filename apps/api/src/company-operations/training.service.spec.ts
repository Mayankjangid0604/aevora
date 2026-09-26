import { Test, TestingModule } from '@nestjs/testing';
import { TrainingService } from './training.service';
import { PrismaService } from '../prisma/prisma.service';

describe('TrainingService', () => {
  let service: TrainingService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const mockPrisma = {
      trainingProgram: { findFirst: jest.fn(), create: jest.fn() },
      employeeTraining: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      companyEvent: { create: jest.fn() },
      employeeSkill: { findFirst: jest.fn(), update: jest.fn(), create: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrainingService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<TrainingService>(TrainingService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create training recommendation', async () => {
    (prisma.trainingProgram.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.trainingProgram.create as jest.Mock).mockResolvedValue({ id: 'prog-1' });
    (prisma.employeeTraining.create as jest.Mock).mockResolvedValue({ id: 'train-1' });

    const result = await service.createTrainingRecommendation('c1', 'e1', 'Skill', 'Cat', 'p1');
    expect(result).toBeDefined();
    expect(prisma.trainingProgram.create).toHaveBeenCalled();
    expect(prisma.employeeTraining.create).toHaveBeenCalled();
  });
});
