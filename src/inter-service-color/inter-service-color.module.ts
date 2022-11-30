import { Module } from '@nestjs/common';
import { InterServiceColorService } from './inter-service-color.service';
import { InterServiceColorResolver } from './inter-service-color.resolver';

@Module({
  providers: [InterServiceColorResolver, InterServiceColorService]
})
export class InterServiceColorModule {}
