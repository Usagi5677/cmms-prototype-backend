import { Test, TestingModule } from '@nestjs/testing';
import { HullTypeService } from './hull-type.service';

describe('HullTypeService', () => {
  let service: HullTypeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HullTypeService],
    }).compile();

    service = module.get<HullTypeService>(HullTypeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
