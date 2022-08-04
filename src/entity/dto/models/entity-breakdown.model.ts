import { ObjectType } from '@nestjs/graphql';
import { BreakdownStatus } from 'src/common/enums/breakdownStatus';
import { BaseModel } from 'src/models/base.model';
import { User } from 'src/models/user.model';

@ObjectType()
export class EntityBreakdown extends BaseModel {
  entityId: number;
  title: string;
  description: string;
  completedBy?: User;
  completedAt?: Date;
  status: BreakdownStatus;
  estimatedDateOfRepair?: Date;
}
