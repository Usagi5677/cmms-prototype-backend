import { ObjectType } from '@nestjs/graphql';
import { PeriodicMaintenanceStatus } from 'src/common/enums/periodicMaintenanceStatus';
import { BaseModel } from './base.model';
import { User } from './user.model';

@ObjectType()
export class TransportationPeriodicMaintenance extends BaseModel {
  title: string;
  description: string;
  transportationId: number;
  period?: number;
  notificationReminder?: number;
  status: PeriodicMaintenanceStatus;
  completedBy?: User;
  completedAt?: Date;
}
