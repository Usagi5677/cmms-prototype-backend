import { BullModule } from '@nestjs/bull';
import { Module, forwardRef } from '@nestjs/common';
import { EntityModule } from 'src/entity/entity.module';
import { NotificationModule } from 'src/resolvers/notification/notification.module';
import { PeriodicMaintenanceConsumer } from './periodic-maintenance.consumer';
import { PeriodicMaintenanceResolver } from './periodic-maintenance.resolver';
import { PeriodicMaintenanceService } from './periodic-maintenance.service';
import { UserModule } from 'src/resolvers/user/user.module';

@Module({
  providers: [
    PeriodicMaintenanceResolver,
    PeriodicMaintenanceService,
    PeriodicMaintenanceConsumer,
  ],
  imports: [
    UserModule,
    forwardRef(() => EntityModule),
    NotificationModule,
    BullModule.registerQueue({
      name: 'cmms-pm-queue',
    }),
  ],
  exports: [PeriodicMaintenanceService],
})
export class PeriodicMaintenanceModule {}
