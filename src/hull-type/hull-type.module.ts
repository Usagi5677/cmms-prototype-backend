import { Module } from '@nestjs/common';
import { HullTypeService } from './hull-type.service';
import { HullTypeResolver } from './hull-type.resolver';
import { UserModule } from 'src/resolvers/user/user.module';

@Module({
  providers: [HullTypeResolver, HullTypeService],
  imports: [UserModule],
})
export class HullTypeModule {}
