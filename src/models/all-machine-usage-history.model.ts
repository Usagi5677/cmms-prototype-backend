import { Field, ObjectType } from '@nestjs/graphql';
import { GraphQLFloat } from 'graphql';
import { BaseModel } from './base.model';

@ObjectType()
export class AllMachineUsageHistory extends BaseModel {
  date: Date;
  @Field(() => GraphQLFloat)
  breakdownHour?: typeof GraphQLFloat;
  @Field(() => GraphQLFloat)
  idleHour?: typeof GraphQLFloat;
  @Field(() => GraphQLFloat)
  workingHour?: typeof GraphQLFloat;
  @Field(() => GraphQLFloat)
  totalHour?: typeof GraphQLFloat;
  @Field(() => GraphQLFloat)
  workingPercentage?: typeof GraphQLFloat;
  @Field(() => GraphQLFloat)
  idlePercentage?: typeof GraphQLFloat;
  @Field(() => GraphQLFloat)
  breakdownPercentage?: typeof GraphQLFloat;
}
