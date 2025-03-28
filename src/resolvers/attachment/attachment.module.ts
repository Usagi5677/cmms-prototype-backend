import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AttachmentService } from 'src/services/attachment.service';
import { AttachmentController } from 'src/controllers/attachment.controller';
import { RedisCacheModule } from 'src/redisCache.module';
import { UserModule } from '../user/user.module';
import { AttachmentResolver } from './attachment.resolver';
import { EntityModule } from 'src/entity/entity.module';

@Module({
  imports: [HttpModule, RedisCacheModule, UserModule, EntityModule],
  controllers: [AttachmentController],
  providers: [AttachmentService, AttachmentResolver],
  exports: [AttachmentService],
})
export class AttachmentModule {}
