import { ObjectType } from '@nestjs/graphql';
import { EntityAttachment } from 'src/entity/dto/models/entity-attachment.model';
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
  attachments: EntityAttachment[];
}
