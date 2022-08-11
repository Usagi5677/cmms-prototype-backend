import { Module } from '@nestjs/common';
import { PermissionResolver } from './permission.resolver';

@Module({
  providers: [PermissionResolver],
})
export class PermissionModule {}
