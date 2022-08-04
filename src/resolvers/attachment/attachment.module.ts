import { PrismaModule } from '../../prisma/prisma.module';
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AttachmentService } from 'src/services/attachment.service';
import { AttachmentController } from 'src/controllers/attachment.controller';
import { RedisCacheModule } from 'src/redisCache.module';
import { UserModule } from '../user/user.module';
import { MachineModule } from '../machine/machine.module';
import { AttachmentResolver } from './attachment.resolver';
import { TransportationModule } from '../transportation/transportation.module';
import { EntityModule } from 'src/entity/entity.module';

@Module({
  imports: [
    PrismaModule,
    HttpModule,
    RedisCacheModule,
    UserModule,
    MachineModule,
    TransportationModule,
    EntityModule,
  ],
  controllers: [AttachmentController],
  providers: [AttachmentService, AttachmentResolver],
  exports: [AttachmentService],
})
export class AttachmentModule {}
