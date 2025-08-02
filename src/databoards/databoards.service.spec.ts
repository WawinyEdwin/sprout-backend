import { Test, TestingModule } from '@nestjs/testing';
import { DataboardsService } from './databoards.service';

describe('DataboardsService', () => {
  let service: DataboardsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DataboardsService],
    }).compile();

    service = module.get<DataboardsService>(DataboardsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
