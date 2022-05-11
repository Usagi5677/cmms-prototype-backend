import { Module } from '@nestjs/common';
import { RedisCacheModule } from 'src/redisCache.module';

import { NotificationModule } from '../notification/notification.module';
import { UserModule } from '../user/user.module';
import { TransportationResolver } from './transportation.resolver';
import { TransportationService } from 'src/services/transportation.service';
import { BullModule } from '@nestjs/bull';
import { TransportationConsumer } from './transportation.consumer';

@Module({
  imports: [
    RedisCacheModule,
    UserModule,
    NotificationModule,
    BullModule.registerQueue({
      name: 'cmms-transportation-history',
    }),
  ],
  providers: [
    TransportationResolver,
    TransportationService,
    TransportationConsumer,
  ],
  exports: [TransportationService],
})
export class TransportationModule {}
