import { ObjectType } from '@nestjs/graphql';
import { BaseModel } from './base.model';

@ObjectType()
export class MachineUsageHistory extends BaseModel {
  date: Date;
  currentRunningHrs: number;
  lastServiceHrs: number;
  interServiceHrs: number;
}
