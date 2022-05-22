import { ObjectType } from '@nestjs/graphql';
import { BaseModel } from './base.model';
import { User } from './user.model';

@ObjectType()
export class MachineAssign extends BaseModel {
  machineId: number;
  userId: number;
  user?: User;
}
