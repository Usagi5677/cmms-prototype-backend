import { ObjectType } from '@nestjs/graphql';
import { BaseModel } from './base.model';
import { ChecklistComment } from './checklist-comment.model.ts';
import { User } from './user.model';

@ObjectType()
export class ChecklistItem extends BaseModel {
  description: string;
  completedBy?: User;
  completedAt?: Date;
  issues: ChecklistComment[];
}
