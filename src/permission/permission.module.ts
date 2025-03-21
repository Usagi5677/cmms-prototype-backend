import { Module } from '@nestjs/common';
import { PermissionResolver } from './permission.resolver';
import { UserModule } from 'src/resolvers/user/user.module';

@Module({
  providers: [PermissionResolver],
  imports: [UserModule],
})
export class PermissionModule {}
