import { ObjectType } from '@nestjs/graphql';
import { BaseModel } from './base.model';

@ObjectType()
export class MachineUsageHistory extends BaseModel {
  date: Date;
  workingHour: number;
  idleHour: number;
  breakdownHour: number;
}
