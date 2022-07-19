import { ObjectType } from '@nestjs/graphql';
import { PeriodicMaintenanceStatus } from 'src/common/enums/periodicMaintenanceStatus';
import { BaseModel } from './base.model';
import { MachinePMTask } from './machine-PM-task.model';
import { Machine } from './machine.model';
import { User } from './user.model';

@ObjectType()
export class MachinePeriodicMaintenance extends BaseModel {
  title: string;
  machineId: number;
  measurement?: string;
  value?: number;
  status: PeriodicMaintenanceStatus;
  completedBy?: User;
  completedAt?: Date;
  startDate?: Date;
  machinePeriodicMaintenanceTask?: MachinePMTask[];
  verifiedBy?: User;
  verifiedAt?: Date;
  machine: Machine;
}
