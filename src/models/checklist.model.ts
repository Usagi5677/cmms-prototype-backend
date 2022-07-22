import { ObjectType } from '@nestjs/graphql';
import { BaseModel } from './base.model';
import { ChecklistComment } from './checklist-comment.model.ts';
import { ChecklistItem } from './checklist-item.model';
import { Machine } from './machine.model';
import { Transportation } from './transportation.model';

@ObjectType()
export class Checklist extends BaseModel {
  machine?: Machine;
  transportation?: Transportation;
  from: Date;
  to: Date;
  type: string;
  currentMeterReading?: number;
  workingHour?: number;
  items: ChecklistItem[];
  comments: ChecklistComment[];
}
