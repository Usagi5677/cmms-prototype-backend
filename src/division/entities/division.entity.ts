import { ObjectType } from '@nestjs/graphql';
import { Entity } from 'src/entity/dto/models/entity.model';
import { BaseModel } from 'src/models/base.model';
import { DivisionAssign } from './division-assign.entity';

@ObjectType()
export class Division extends BaseModel {
  name: string;
  entity?: Entity[];
  assignees?: DivisionAssign[];
}
