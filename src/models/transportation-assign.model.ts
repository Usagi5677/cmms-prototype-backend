import { ObjectType } from '@nestjs/graphql';
import { BaseModel } from './base.model';
import { User } from './user.model';

@ObjectType()
export class TransportationAssign extends BaseModel {
  transportationId: number;
  userId: number;
  user?: User;
}
