import { ObjectType } from '@nestjs/graphql';
import { BaseModel } from './base.model';
import { User } from './user.model';

@ObjectType()
export class PeriodicMaintenance extends BaseModel {
  description: string;
  period?: Date;
  notificationReminder?: Date;
  completedBy?: User;
  completedAt?: Date;
}
