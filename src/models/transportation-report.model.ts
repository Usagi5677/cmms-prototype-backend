import { ObjectType } from '@nestjs/graphql';

import { BaseModel } from './base.model';

@ObjectType()
export class TransportationReport extends BaseModel {
  type?: string;
  working: number;
  breakdown: number;
}
