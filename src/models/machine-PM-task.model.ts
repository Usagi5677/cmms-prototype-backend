import { ObjectType } from '@nestjs/graphql';
import { RepairStatus } from 'src/common/enums/repairStatus';
import { BaseModel } from './base.model';
import { User } from './user.model';

@ObjectType()
export class MachinePMTask extends BaseModel {
  periodicMaintenanceId?: number;
  parentTaskId?: number;
  name?: string;
  completedBy?: User;
  completedAt?: Date;
  parentTask?: MachinePMTask;
  subTasks?: MachinePMTask[];
}
