import { ObjectType } from '@nestjs/graphql';
import { BaseModel } from './base.model';
import { User } from './user.model';

@ObjectType()
export class Notification extends BaseModel {
  user: User;
  body: string;
  readAt?: Date;
  link?: string;
  userId: number;
}
