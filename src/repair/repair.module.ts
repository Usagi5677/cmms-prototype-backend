import { Module, forwardRef } from '@nestjs/common';
import { RepairService } from './repair.service';
import { RepairResolver } from './repair.resolver';
import { NotificationModule } from 'src/resolvers/notification/notification.module';
import { RedisCacheModule } from 'src/redisCache.module';
import { EntityModule } from 'src/entity/entity.module';

@Module({
  providers: [RepairResolver, RepairService],
  imports: [
    forwardRef(() => EntityModule),
    NotificationModule,
    RedisCacheModule,
  ],
  exports: [RepairService],
})
export class RepairModule {}
