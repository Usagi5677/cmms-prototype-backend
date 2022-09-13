import { Module } from '@nestjs/common';
import { RepairService } from './repair.service';
import { RepairResolver } from './repair.resolver';
import { NotificationModule } from 'src/resolvers/notification/notification.module';
import { RedisCacheModule } from 'src/redisCache.module';

@Module({
  providers: [RepairResolver, RepairService],
  imports: [NotificationModule, RedisCacheModule],
  exports: [RepairService],
})
export class RepairModule {}
