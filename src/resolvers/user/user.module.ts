import { UserResolver } from './user.resolver';
import { forwardRef, Global, Module } from '@nestjs/common';
import { UserService } from '../../services/user.service';
import { RedisCacheModule } from 'src/redisCache.module';
import { APSService } from 'src/services/aps.service';
import { APSModule } from '../profile/profile.module';

@Global()
@Module({
  imports: [forwardRef(() => RedisCacheModule), forwardRef(() => APSModule)],
  providers: [UserResolver, UserService, APSService],
  exports: [UserService],
})
export class UserModule {}
