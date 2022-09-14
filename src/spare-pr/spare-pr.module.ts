import { Module, forwardRef } from '@nestjs/common';
import { SparePrService } from './spare-pr.service';
import { SparePrResolver } from './spare-pr.resolver';
import { EntityModule } from 'src/entity/entity.module';
import { RedisCacheModule } from 'src/redisCache.module';
import { NotificationModule } from 'src/resolvers/notification/notification.module';

@Module({
  providers: [SparePrResolver, SparePrService],
  imports: [
    forwardRef(() => EntityModule),
    NotificationModule,
    RedisCacheModule,
  ],
  exports: [SparePrService],
})
export class SparePrModule {}
