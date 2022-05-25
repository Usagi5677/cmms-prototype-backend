import { ObjectType } from '@nestjs/graphql';

import { BaseModel } from './base.model';

@ObjectType()
export class MachineReport extends BaseModel {
  type?: string;
  working: number;
  breakdown: number;
}
