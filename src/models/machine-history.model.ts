import { Field, ObjectType } from '@nestjs/graphql';
import { Prisma } from '@prisma/client';
import { GraphQLFloat } from 'graphql';
import { MachineStatus } from 'src/common/enums/machineStatus';
import { BaseModel } from './base.model';
import { User } from './user.model';

@ObjectType()
export class MachineHistory extends BaseModel {
  type: string;
  description: string;
  machineId?: number;
  completedBy?: User;
  completedById?: number;
  machineStatus?: MachineStatus;
  machineType?: string;
  @Field(() => GraphQLFloat)
  breakdownHour?: typeof GraphQLFloat;
  @Field(() => GraphQLFloat)
  idleHour?: typeof GraphQLFloat;
  @Field(() => GraphQLFloat)
  workingHour?: typeof GraphQLFloat;
  location?: string;
}
