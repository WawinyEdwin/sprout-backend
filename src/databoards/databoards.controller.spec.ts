import { Test, TestingModule } from '@nestjs/testing';
import { DataboardsController } from './databoards.controller';
import { DataboardsService } from './databoards.service';

describe('DataboardsController', () => {
  let controller: DataboardsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DataboardsController],
      providers: [DataboardsService],
    }).compile();

    controller = module.get<DataboardsController>(DataboardsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
