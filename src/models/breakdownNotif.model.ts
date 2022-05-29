import { ObjectType } from '@nestjs/graphql';
import { BaseModel } from './base.model';
import { User } from './user.model';

@ObjectType()
export class BreakdownNotif extends BaseModel {
  count?: number;
}
