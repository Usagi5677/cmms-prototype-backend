import { ObjectType } from '@nestjs/graphql';
import { BreakdownStatus } from 'src/common/enums/breakdownStatus';
import { BaseModel } from './base.model';
import { User } from './user.model';

@ObjectType()
export class MachineBreakdown extends BaseModel {
  title: string;
  description: string;
  completedBy?: User;
  completedAt?: Date;
  status: BreakdownStatus;
}
