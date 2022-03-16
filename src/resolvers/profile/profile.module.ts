import { Module } from '@nestjs/common';
import { RedisCacheModule } from 'src/redisCache.module';
import { APSService } from 'src/services/aps.service';

@Module({
  imports: [RedisCacheModule],
  providers: [APSService],
  exports: [APSService],
})
export class APSModule {}
