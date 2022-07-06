import { Field, ObjectType } from '@nestjs/graphql';
import { GraphQLFloat } from 'graphql';
import { BaseModel } from './base.model';

@ObjectType()
export class TransportationUsageHistory extends BaseModel {
  date: Date;
  @Field(() => GraphQLFloat)
  breakdownHour?: typeof GraphQLFloat;
  @Field(() => GraphQLFloat)
  idleHour?: typeof GraphQLFloat;
  @Field(() => GraphQLFloat)
  workingHour?: typeof GraphQLFloat;
}
