import { ObjectType } from '@nestjs/graphql';
import { Entity } from 'src/entity/dto/models/entity.model';
import { BaseModel } from 'src/models/base.model';
import { User } from 'src/models/user.model';
import { PeriodicMaintenanceComment } from './periodic-maintenance-comment.model';
import { PeriodicMaintenanceNotification } from './periodic-maintenance-notification.model';
import { PeriodicMaintenanceTask } from './periodic-maintenance-task.model';

@ObjectType()
export class PeriodicMaintenance extends BaseModel {
  entityId?: number;
  originId?: number;
  name?: string;
  from?: Date;
  to?: Date;
  measurement?: string;
  value?: number;
  currentMeterReading?: number;
  type?: string;
  status?: string;
  recur: boolean;
  tasks?: PeriodicMaintenanceTask[];
  verifiedBy?: User;
  verifiedAt?: Date;
  entity?: Entity;
  comments?: PeriodicMaintenanceComment[];
  notificationReminder?: PeriodicMaintenanceNotification[];
  dueAt?: number;
}
