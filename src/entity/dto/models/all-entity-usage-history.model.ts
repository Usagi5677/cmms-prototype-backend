import { Field, ObjectType } from '@nestjs/graphql';
import { GraphQLFloat, GraphQLString } from 'graphql';
import { BaseModel } from 'src/models/base.model';

@ObjectType()
export class AllEntityUsageHistory extends BaseModel {
  date: Date;
  workingHour?: number;
  idleHour?: number;
  breakdownHour?: number;
  na?: number;
  @Field(() => GraphQLFloat)
  totalHour?: typeof GraphQLFloat;
  @Field(() => GraphQLFloat)
  workingPercentage?: typeof GraphQLFloat;
  @Field(() => GraphQLFloat)
  idlePercentage?: typeof GraphQLFloat;
  @Field(() => GraphQLFloat)
  breakdownPercentage?: typeof GraphQLFloat;
  @Field(() => GraphQLString)
  machineNumber?: typeof GraphQLString;
}
