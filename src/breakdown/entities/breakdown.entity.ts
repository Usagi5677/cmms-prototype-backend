import { ObjectType } from '@nestjs/graphql';
import { Entity } from 'src/entity/dto/models/entity.model';
import { BaseModel } from 'src/models/base.model';
import { User } from 'src/models/user.model';
import { Repair } from 'src/repair/entities/repair.entity';
import { BreakdownComment } from './breakdown-comment.entity';
import { BreakdownDetail } from './breakdown-detail.entity';

@ObjectType()
export class Breakdown extends BaseModel {
  name: string;
  type: string;
  estimatedDateOfRepair?: Date;
  completedAt?: Date;
  createdBy: User;
  entity: Entity;
  details?: BreakdownDetail[];
  comments?: BreakdownComment[];
  repairs?: Repair[];
}
