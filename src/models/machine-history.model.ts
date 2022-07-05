import { Field, ObjectType } from '@nestjs/graphql';
import { Prisma } from '@prisma/client';
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
  breakdownHour?: number;
  idleHour?: number;
  workingHour?: number;
  location?: string;
}
