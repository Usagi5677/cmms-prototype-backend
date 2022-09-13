import { Module } from '@nestjs/common';
import { BreakdownService } from './breakdown.service';
import { BreakdownResolver } from './breakdown.resolver';
import { NotificationModule } from 'src/resolvers/notification/notification.module';
import { RedisCacheModule } from 'src/redisCache.module';

@Module({
  providers: [BreakdownResolver, BreakdownService],
  imports: [NotificationModule, RedisCacheModule],
  exports: [BreakdownService],
})
export class BreakdownModule {}
