import { Module } from '@nestjs/common';
import { InterServiceColorService } from './inter-service-color.service';
import { InterServiceColorResolver } from './inter-service-color.resolver';
import { UserModule } from 'src/resolvers/user/user.module';

@Module({
  providers: [InterServiceColorResolver, InterServiceColorService],
  imports: [UserModule],
})
export class InterServiceColorModule {}
