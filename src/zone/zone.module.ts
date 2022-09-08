import { Module } from '@nestjs/common';
import { ZoneService } from './zone.service';
import { ZoneResolver } from './zone.resolver';

@Module({
  providers: [ZoneResolver, ZoneService]
})
export class ZoneModule {}
