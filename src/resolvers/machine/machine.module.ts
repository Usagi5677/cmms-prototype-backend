import { Module } from '@nestjs/common';
import { RedisCacheModule } from 'src/redisCache.module';

import { NotificationModule } from '../notification/notification.module';
import { UserModule } from '../user/user.module';
import { MachineResolver } from './machine.resolver';
import { MachineService } from 'src/services/machine.service';

@Module({
  imports: [RedisCacheModule, UserModule, NotificationModule],
  providers: [MachineResolver, MachineService],
  exports: [MachineService],
})
export class MachineModule {}
