import { Module } from '@nestjs/common';
import { RedisCacheModule } from 'src/redisCache.module';

import { NotificationModule } from '../notification/notification.module';
import { UserModule } from '../user/user.module';
import { MachineResolver } from './machine.resolver';
import { MachineService } from 'src/services/machine.service';
import { BullModule } from '@nestjs/bull';
import { MachineConsumer } from './machine.consumer';
import { ChecklistTemplateModule } from '../checklist-template/checklist-template.module';

@Module({
  imports: [
    RedisCacheModule,
    UserModule,
    NotificationModule,
    BullModule.registerQueue({
      name: 'cmms-machine-history',
    }),
    ChecklistTemplateModule,
  ],
  providers: [MachineResolver, MachineService, MachineConsumer],
  exports: [MachineService],
})
export class MachineModule {}
