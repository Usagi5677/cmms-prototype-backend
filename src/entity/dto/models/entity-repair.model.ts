import { ObjectType } from '@nestjs/graphql';
import { RepairStatus } from 'src/common/enums/repairStatus';
import { BaseModel } from 'src/models/base.model';
import { User } from 'src/models/user.model';

@ObjectType()
export class EntityRepair extends BaseModel {
  entityId: number;
  title: string;
  description: string;
  completedBy?: User;
  completedAt?: Date;
  status: RepairStatus;
}
