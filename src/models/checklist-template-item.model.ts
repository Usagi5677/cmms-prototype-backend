import { ObjectType } from '@nestjs/graphql';
import { BaseModel } from './base.model';

@ObjectType()
export class ChecklistTemplateItem extends BaseModel {
  name: string;
}
