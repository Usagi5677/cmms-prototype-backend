import { Module } from '@nestjs/common';
import { EngineService } from './engine.service';
import { EngineResolver } from './engine.resolver';

@Module({
  providers: [EngineResolver, EngineService]
})
export class EngineModule {}
