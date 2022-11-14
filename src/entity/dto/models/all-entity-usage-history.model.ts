import { Field, ObjectType } from '@nestjs/graphql';
import { GraphQLFloat, GraphQLString } from 'graphql';

@ObjectType()
export class AllEntityUsageHistory {
  date: Date;
  workingHour?: number;
  idleHour?: number;
  breakdownHour?: number;
  na?: number;
  total?: number;
  id?: number;
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
