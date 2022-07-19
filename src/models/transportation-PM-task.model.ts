import { ObjectType } from '@nestjs/graphql';
import { RepairStatus } from 'src/common/enums/repairStatus';
import { BaseModel } from './base.model';
import { TransportationPeriodicMaintenance } from './transportation-periodic-maintenance.model';
import { User } from './user.model';

@ObjectType()
export class TransportationPMTask extends BaseModel {
  periodicMaintenanceId?: number;
  parentTaskId?: number;
  name?: string;
  completedBy?: User;
  completedAt?: Date;
  parentTask?: TransportationPMTask;
  subTasks?: TransportationPMTask[];
  periodicMaintenance: TransportationPeriodicMaintenance;
}
