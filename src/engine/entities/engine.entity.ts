import { ObjectType } from '@nestjs/graphql';
import { BaseModel } from 'src/models/base.model';

@ObjectType()
export class Engine extends BaseModel {
  name: string;
  model?: string;
  serial?: string;
}
