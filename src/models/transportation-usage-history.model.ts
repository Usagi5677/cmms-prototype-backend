import { ObjectType } from '@nestjs/graphql';
import { BaseModel } from './base.model';

@ObjectType()
export class TransportationUsageHistory extends BaseModel {
  date: Date;
  currentMileage: number;
  lastServiceMileage: number;
  interServiceMileage: number;
}
