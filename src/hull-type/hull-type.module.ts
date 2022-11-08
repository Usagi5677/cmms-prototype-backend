import { Module } from '@nestjs/common';
import { HullTypeService } from './hull-type.service';
import { HullTypeResolver } from './hull-type.resolver';

@Module({
  providers: [HullTypeResolver, HullTypeService]
})
export class HullTypeModule {}
