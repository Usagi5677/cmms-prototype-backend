import { Module } from '@nestjs/common';
import { RedisCacheModule } from 'src/redisCache.module';

import { NotificationModule } from '../notification/notification.module';
import { UserModule } from '../user/user.module';
import { PermissionRoleResolver } from './permissionRole.resolver';
import { PermissionRoleService } from 'src/services/permissionRole.service';

@Module({
  imports: [RedisCacheModule, UserModule, NotificationModule],
  providers: [PermissionRoleResolver, PermissionRoleService],
  exports: [PermissionRoleService],
})
export class PermissionRoleModule {}
