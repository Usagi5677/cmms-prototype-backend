import { ObjectType } from '@nestjs/graphql';
import { PeriodicMaintenanceStatus } from 'src/common/enums/periodicMaintenanceStatus';
import { BaseModel } from './base.model';
import { TransportationPMTask } from './transportation-PM-task.model';
import { Transportation } from './transportation.model';
import { User } from './user.model';

@ObjectType()
export class TransportationPeriodicMaintenance extends BaseModel {
  title: string;
  transportationId: number;
  measurement?: string;
  value?: number;
  status: PeriodicMaintenanceStatus;
  completedBy?: User;
  completedAt?: Date;
  startDate?: Date;
  transportationPeriodicMaintenanceTask?: TransportationPMTask[];
  verifiedBy?: User;
  verifiedAt?: Date;
  transportation?: Transportation;
}
