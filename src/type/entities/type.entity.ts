import { ObjectType } from '@nestjs/graphql';
import { BaseModel } from 'src/models/base.model';

@ObjectType()
export class Type extends BaseModel {
  entityType: string;
  name: string;
}
