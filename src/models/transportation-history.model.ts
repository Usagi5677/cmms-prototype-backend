import { ObjectType } from '@nestjs/graphql';
import { BaseModel } from './base.model';
import { User } from './user.model';

@ObjectType()
export class TransportationHistory extends BaseModel {
  type: string;
  description: string;
  transportationId?: number;
  completedBy?: User;
  completedById?: number;
}
