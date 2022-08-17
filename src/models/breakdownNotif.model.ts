import { ObjectType } from '@nestjs/graphql';
import { BaseModel } from './base.model';

@ObjectType()
export class BreakdownNotif extends BaseModel {
  count?: number;
}
