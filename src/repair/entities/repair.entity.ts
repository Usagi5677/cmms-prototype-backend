import { ObjectType } from '@nestjs/graphql';
import { BreakdownDetail } from 'src/breakdown/entities/breakdown-detail.entity';
import { Breakdown } from 'src/breakdown/entities/breakdown.entity';
import { Entity } from 'src/entity/dto/models/entity.model';
import { BaseModel } from 'src/models/base.model';
import { User } from 'src/models/user.model';
import { RepairComment } from './repair-comment.entity';

@ObjectType()
export class Repair extends BaseModel {
  name: string;
  createdBy: User;
  breakdown?: Breakdown;
  breakdownDetail?: BreakdownDetail;
  entity: Entity;
  comments?: RepairComment[];
}
