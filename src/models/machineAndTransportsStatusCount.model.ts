import { ObjectType } from '@nestjs/graphql';
import { BaseModel } from './base.model';
import { User } from './user.model';

@ObjectType()
export class machineAndTransportsStatusCount {
  machineWorking?: number;
  machineIdle?: number;
  machineBreakdown?: number;
  transportationWorking?: number;
  transportationIdle?: number;
  transportationBreakdown?: number;
}
