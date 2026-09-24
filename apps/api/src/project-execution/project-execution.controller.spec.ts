import { Test, TestingModule } from '@nestjs/testing';
import { ProjectExecutionController } from './project-execution.controller';
import { ProjectExecutionService } from './project-execution.service';

describe('ProjectExecutionController', () => {
  let controller: ProjectExecutionController;

  beforeEach(async () => {
    const mockService = {
      getRequirements: jest.fn(),
      createRequirement: jest.fn(),
      updateRequirement: jest.fn(),
      getPlans: jest.fn(),
      createPlan: jest.fn(),
      getMilestones: jest.fn(),
      createMilestone: jest.fn(),
      getRisks: jest.fn(),
      createRisk: jest.fn(),
      getAssignments: jest.fn(),
      proposeStaffing: jest.fn(),
      createProjectTask: jest.fn(),
      submitTaskForReview: jest.fn(),
      getDeliveries: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectExecutionController],
      providers: [
        { provide: ProjectExecutionService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<ProjectExecutionController>(ProjectExecutionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
