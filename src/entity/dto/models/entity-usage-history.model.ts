import { ObjectType } from '@nestjs/graphql';
import { BaseModel } from 'src/models/base.model';

@ObjectType()
export class EntityUsageHistory extends BaseModel {
  date: Date;
  workingHour?: number;
  idleHour?: number;
  breakdownHour?: number;
  na?: number;
}
