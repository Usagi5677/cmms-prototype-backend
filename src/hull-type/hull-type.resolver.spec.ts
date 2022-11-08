import { Test, TestingModule } from '@nestjs/testing';
import { HullTypeResolver } from './hull-type.resolver';
import { HullTypeService } from './hull-type.service';

describe('HullTypeResolver', () => {
  let resolver: HullTypeResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HullTypeResolver, HullTypeService],
    }).compile();

    resolver = module.get<HullTypeResolver>(HullTypeResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
