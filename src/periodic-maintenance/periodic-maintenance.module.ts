import { Module, forwardRef } from '@nestjs/common';
import { EntityModule } from 'src/entity/entity.module';
import { NotificationModule } from 'src/resolvers/notification/notification.module';
import { PeriodicMaintenanceResolver } from './periodic-maintenance.resolver';
import { PeriodicMaintenanceService } from './periodic-maintenance.service';

@Module({
  providers: [PeriodicMaintenanceResolver, PeriodicMaintenanceService],
  imports: [forwardRef(() => EntityModule), NotificationModule],
  exports: [PeriodicMaintenanceService],
})
export class PeriodicMaintenanceModule {}
