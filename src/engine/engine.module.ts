import { Module } from '@nestjs/common';
import { EngineService } from './engine.service';
import { EngineResolver } from './engine.resolver';
import { UserModule } from 'src/resolvers/user/user.module';

@Module({
  providers: [EngineResolver, EngineService],
  imports: [UserModule],
})
export class EngineModule {}
