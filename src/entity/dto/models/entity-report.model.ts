import { ObjectType } from '@nestjs/graphql';
import { BaseModel } from 'src/models/base.model';

@ObjectType()
export class EntityReport extends BaseModel {
  type?: string;
  working: number;
  breakdown: number;
}
