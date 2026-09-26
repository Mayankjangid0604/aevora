import { Test, TestingModule } from '@nestjs/testing';
import { ReceptionistController } from './receptionist.controller';

describe('ReceptionistController', () => {
  let controller: ReceptionistController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReceptionistController],
    }).compile();

    controller = module.get<ReceptionistController>(ReceptionistController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
