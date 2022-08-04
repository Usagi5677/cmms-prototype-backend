import { Field, ObjectType } from '@nestjs/graphql';
import { GraphQLFloat } from 'graphql';
import { EntityStatus } from 'src/common/enums/entityStatus';
import { BaseModel } from 'src/models/base.model';
import { User } from 'src/models/user.model';

@ObjectType()
export class EntityHistory extends BaseModel {
  type: string;
  description: string;
  entityId?: number;
  completedBy?: User;
  completedById?: number;
  entityStatus?: EntityStatus;
  entityType?: string;
  @Field(() => GraphQLFloat)
  breakdownHour?: typeof GraphQLFloat;
  @Field(() => GraphQLFloat)
  idleHour?: typeof GraphQLFloat;
  @Field(() => GraphQLFloat)
  workingHour?: typeof GraphQLFloat;
  location?: string;
}
