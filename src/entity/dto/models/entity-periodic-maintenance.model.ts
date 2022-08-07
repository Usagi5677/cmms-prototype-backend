import { ObjectType } from '@nestjs/graphql';
import { PeriodicMaintenanceStatus } from 'src/common/enums/periodicMaintenanceStatus';
import { BaseModel } from 'src/models/base.model';
import { User } from 'src/models/user.model';
import { EntityPMTask } from './entity-PM-task.model';
import { Entity } from './entity.model';

@ObjectType()
export class EntityPeriodicMaintenance extends BaseModel {
  title: string;
  entityId: number;
  measurement?: string;
  value?: number;
  status: PeriodicMaintenanceStatus;
  completedBy?: User;
  completedAt?: Date;
  startDate?: Date;
  entityPeriodicMaintenanceTask?: EntityPMTask[];
  verifiedBy?: User;
  verifiedAt?: Date;
  entity: Entity;
}
