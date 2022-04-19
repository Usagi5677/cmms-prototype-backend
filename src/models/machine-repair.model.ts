import { ObjectType } from '@nestjs/graphql';
import { RepairStatus } from 'src/common/enums/repairStatus';
import { BaseModel } from './base.model';
import { Machine } from './machine.model';
import { User } from './user.model';

@ObjectType()
export class MachineRepair extends BaseModel {
  title: string;
  description: string;
  completedBy?: User;
  completedAt?: Date;
  status: RepairStatus;
}
