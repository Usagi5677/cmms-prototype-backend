import { ObjectType } from '@nestjs/graphql';
import { BaseModel } from './base.model';
import { User } from './user.model';

@ObjectType()
export class MachineHistory extends BaseModel {
  type: string;
  description: string;
}
