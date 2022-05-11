import { ObjectType } from '@nestjs/graphql';
import { RepairStatus } from 'src/common/enums/repairStatus';
import { BaseModel } from './base.model';
import { User } from './user.model';

@ObjectType()
export class TransportationRepair extends BaseModel {
  transportationId: number;
  title: string;
  description: string;
  completedBy?: User;
  completedAt?: Date;
  status: RepairStatus;
}
