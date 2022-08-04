import { Field, ObjectType } from '@nestjs/graphql';
import { GraphQLFloat } from 'graphql';
import { BaseModel } from 'src/models/base.model';

@ObjectType()
export class EntityUsageHistory extends BaseModel {
  date: Date;
  @Field(() => GraphQLFloat)
  breakdownHour?: typeof GraphQLFloat;
  @Field(() => GraphQLFloat)
  idleHour?: typeof GraphQLFloat;
  @Field(() => GraphQLFloat)
  workingHour?: typeof GraphQLFloat;
}
