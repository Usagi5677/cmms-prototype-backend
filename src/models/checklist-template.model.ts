import { ObjectType } from '@nestjs/graphql';
import { BaseModel } from './base.model';
import { ChecklistTemplateItem } from './checklist-template-item.model';
import { Machine } from './machine.model';
import { Transportation } from './transportation.model';

@ObjectType()
export class ChecklistTemplate extends BaseModel {
  name?: string;
  type: string;
  items: ChecklistTemplateItem[];
  machinesDaily?: Machine[];
  machinesWeekly?: Machine[];
  transportationDaily?: Transportation[];
  transportationWeekly?: Transportation[];
}
