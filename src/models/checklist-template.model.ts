import { ObjectType } from '@nestjs/graphql';
import { Entity } from 'src/entity/dto/models/entity.model';
import { BaseModel } from './base.model';
import { ChecklistTemplateItem } from './checklist-template-item.model';

@ObjectType()
export class ChecklistTemplate extends BaseModel {
  name?: string;
  type: string;
  items: ChecklistTemplateItem[];
  entitiesDaily?: Entity[];
  entitiesWeekly?: Entity[];
}
