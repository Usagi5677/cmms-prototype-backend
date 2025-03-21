import { Global, Module } from '@nestjs/common';
import { ApiKeyService } from './api-key.service';
import { ApiKeyResolver } from './api-key.resolver';
import { RedisCacheModule } from 'src/redisCache.module';
import { UserModule } from 'src/resolvers/user/user.module';

@Global()
@Module({
  providers: [ApiKeyService, ApiKeyResolver],
  imports: [RedisCacheModule, UserModule],
  exports: [ApiKeyService],
})
export class ApiKeyModule {}
