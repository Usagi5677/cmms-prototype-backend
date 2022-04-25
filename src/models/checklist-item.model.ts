import { ObjectType } from '@nestjs/graphql';
import { BaseModel } from './base.model';
import { User } from './user.model';

@ObjectType()
export class ChecklistItem extends BaseModel {
  description: string;
  type: string;
  completedBy?: User;
  completedAt?: Date;
}
