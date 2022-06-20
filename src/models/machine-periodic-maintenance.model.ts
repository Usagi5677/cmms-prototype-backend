import { ObjectType } from '@nestjs/graphql';
import { PeriodicMaintenanceStatus } from 'src/common/enums/periodicMaintenanceStatus';
import { BaseModel } from './base.model';
import { MachinePMTask } from './machine-PM-task.model';
import { User } from './user.model';

@ObjectType()
export class MachinePeriodicMaintenance extends BaseModel {
  title: string;
  description: string;
  machineId: number;
  period?: number;
  notificationReminder?: number;
  status: PeriodicMaintenanceStatus;
  completedBy?: User;
  completedAt?: Date;
  fixedDate?: Date;
  MachinePeriodicMaintenanceTask?: MachinePMTask[];
}
