import { ObjectType } from '@nestjs/graphql';
import { BaseModel } from './base.model';
import { User } from './user.model';

@ObjectType()
export class ChecklistComment extends BaseModel {
  description: string;
  user?: User;
}
