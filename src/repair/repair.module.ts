import { Module, forwardRef } from '@nestjs/common';
import { RepairService } from './repair.service';
import { RepairResolver } from './repair.resolver';
import { NotificationModule } from 'src/resolvers/notification/notification.module';
import { RedisCacheModule } from 'src/redisCache.module';
import { EntityModule } from 'src/entity/entity.module';
import { UserModule } from 'src/resolvers/user/user.module';

@Module({
  providers: [RepairResolver, RepairService],
  imports: [
    UserModule,
    forwardRef(() => EntityModule),
    NotificationModule,
    RedisCacheModule,
  ],
  exports: [RepairService],
})
export class RepairModule {}
