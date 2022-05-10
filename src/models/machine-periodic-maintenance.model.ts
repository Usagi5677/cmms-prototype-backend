import { ObjectType } from '@nestjs/graphql';
import { PeriodicMaintenanceStatus } from 'src/common/enums/periodicMaintenanceStatus';
import { BaseModel } from './base.model';
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
}
