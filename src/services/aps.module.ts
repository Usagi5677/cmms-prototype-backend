// src/services/aps.module.ts

import { Module, forwardRef } from '@nestjs/common';
import { APSService } from './aps.service';
import { UserModule } from '../resolvers/user/user.module';
import { RedisCacheModule } from '../redisCache.module';

@Module({
  imports: [forwardRef(() => UserModule), RedisCacheModule],
  providers: [APSService],
  exports: [APSService],
})
export class APSModule {}
