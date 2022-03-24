import { Module } from '@nestjs/common';
import { RedisCacheModule } from 'src/redisCache.module';

import { NotificationModule } from '../notification/notification.module';
import { UserModule } from '../user/user.module';
import { TransportationResolver } from './transportation.resolver';
import { TransportationService } from 'src/services/transportation.service';

@Module({
  imports: [RedisCacheModule, UserModule, NotificationModule],
  providers: [TransportationResolver, TransportationService],
  exports: [TransportationService],
})
export class TransportationModule {}
