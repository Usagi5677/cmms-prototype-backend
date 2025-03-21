import { Module } from '@nestjs/common';
import { ZoneService } from './zone.service';
import { ZoneResolver } from './zone.resolver';
import { UserModule } from 'src/resolvers/user/user.module';

@Module({
  providers: [ZoneResolver, ZoneService],
  imports: [UserModule],
})
export class ZoneModule {}
