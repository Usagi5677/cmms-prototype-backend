import { ObjectType } from '@nestjs/graphql';
import { ChecklistSummary } from 'src/checklist/dto/checklist-summary';
import { EntityAttachment } from 'src/entity/dto/models/entity-attachment.model';
import { Entity } from 'src/entity/dto/models/entity.model';
import { BaseModel } from './base.model';
import { ChecklistComment } from './checklist-comment.model.ts';
import { ChecklistItem } from './checklist-item.model';

@ObjectType()
export class Checklist extends BaseModel {
  from: Date;
  to: Date;
  type: string;
  currentMeterReading?: number;
  workingHour?: number;
  items: ChecklistItem[];
  comments: ChecklistComment[];
  attachments: EntityAttachment[];
  entity?: Entity;
  summary?: ChecklistSummary;
}
