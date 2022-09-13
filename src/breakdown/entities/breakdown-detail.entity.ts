import { ObjectType } from '@nestjs/graphql';
import { Entity } from 'src/entity/dto/models/entity.model';
import { BaseModel } from 'src/models/base.model';
import { User } from 'src/models/user.model';
import { BreakdownComment } from './breakdown-comment.entity';
import { Breakdown } from './breakdown.entity';

@ObjectType()
export class BreakdownDetail extends BaseModel {
  description: string;
  breakdown: Breakdown;
  createdBy: User;
  entity: Entity;
  comments?: BreakdownComment[];
}
