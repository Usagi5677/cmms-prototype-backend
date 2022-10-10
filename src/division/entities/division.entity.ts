import { ObjectType } from '@nestjs/graphql';
import { BaseModel } from 'src/models/base.model';
import { User } from 'src/models/user.model';
import { DivisionAssign } from './division-assign.entity';

@ObjectType()
export class Division extends BaseModel {
  name: string;
  assignees?: DivisionAssign[];
}
