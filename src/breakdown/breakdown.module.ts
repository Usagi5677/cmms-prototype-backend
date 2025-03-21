import { Module, forwardRef } from '@nestjs/common';
import { BreakdownService } from './breakdown.service';
import { BreakdownResolver } from './breakdown.resolver';
import { NotificationModule } from 'src/resolvers/notification/notification.module';
import { RedisCacheModule } from 'src/redisCache.module';
import { EntityModule } from 'src/entity/entity.module';
import { UserModule } from 'src/resolvers/user/user.module';

@Module({
  providers: [BreakdownResolver, BreakdownService],
  imports: [
    UserModule,
    forwardRef(() => EntityModule),
    NotificationModule,
    RedisCacheModule,
  ],
  exports: [BreakdownService],
})
export class BreakdownModule {}
