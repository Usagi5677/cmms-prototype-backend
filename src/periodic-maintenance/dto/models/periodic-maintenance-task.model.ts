import { ObjectType } from '@nestjs/graphql';
import { BaseModel } from 'src/models/base.model';
import { User } from 'src/models/user.model';
import { PeriodicMaintenanceComment } from './periodic-maintenance-comment.model';
import { PeriodicMaintenance } from './periodic-maintenance.model';

@ObjectType()
export class PeriodicMaintenanceTask extends BaseModel {
  periodicMaintenanceId?: number;
  parentTaskId?: number;
  name?: string;
  completedBy?: User;
  completedAt?: Date;
  parentTask?: PeriodicMaintenanceTask;
  subTasks?: PeriodicMaintenanceTask[];
  remarks?: PeriodicMaintenanceComment[];
  periodicMaintenance: PeriodicMaintenance;
}
