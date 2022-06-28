import { ObjectType } from '@nestjs/graphql';
import { BreakdownStatus } from 'src/common/enums/breakdownStatus';
import { BaseModel } from './base.model';
import { User } from './user.model';

@ObjectType()
export class TransportationBreakdown extends BaseModel {
  transportationId: number;
  title: string;
  description: string;
  completedBy?: User;
  completedAt?: Date;
  status: BreakdownStatus;
  estimatedDateOfRepair?: Date;
}
