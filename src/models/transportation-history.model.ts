import { Field, ObjectType } from '@nestjs/graphql';
import { GraphQLFloat } from 'graphql';
import { TransportationStatus } from 'src/common/enums/transportationStatus';
import { BaseModel } from './base.model';
import { User } from './user.model';

@ObjectType()
export class TransportationHistory extends BaseModel {
  type: string;
  description: string;
  transportationId?: number;
  completedBy?: User;
  completedById?: number;
  transportationStatus?: TransportationStatus;
  transportationType?: string;
  @Field(() => GraphQLFloat)
  breakdownHour?: typeof GraphQLFloat;
  @Field(() => GraphQLFloat)
  idleHour?: typeof GraphQLFloat;
  @Field(() => GraphQLFloat)
  workingHour?: typeof GraphQLFloat;
  location?: string;
}
