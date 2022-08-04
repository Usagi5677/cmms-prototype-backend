import { ObjectType } from '@nestjs/graphql';
import { RepairStatus } from 'src/common/enums/repairStatus';
import { BaseModel } from 'src/models/base.model';
import { User } from 'src/models/user.model';
import { EntityPeriodicMaintenance } from './entity-periodic-maintenance.model';

@ObjectType()
export class EntityPMTask extends BaseModel {
  periodicMaintenanceId?: number;
  parentTaskId?: number;
  name?: string;
  completedBy?: User;
  completedAt?: Date;
  parentTask?: EntityPMTask;
  subTasks?: EntityPMTask[];
  periodicMaintenance: EntityPeriodicMaintenance;
}
