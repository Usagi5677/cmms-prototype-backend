import { forwardRef, Module } from '@nestjs/common';
import { RedisCacheService } from './redisCache.service';
import { RedisCacheResolver } from './redisCache.resolver';
import { UserModule } from './resolvers/user/user.module';
import { UserService } from './services/user.service';
import { APSModule } from './resolvers/profile/profile.module';

@Module({
  imports: [forwardRef(() => UserModule), forwardRef(() => APSModule)],
  providers: [RedisCacheService, RedisCacheResolver, UserService],
  exports: [RedisCacheService],
})
export class RedisCacheModule {}
