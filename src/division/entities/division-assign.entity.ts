import { ObjectType } from '@nestjs/graphql';
import { BaseModel } from 'src/models/base.model';
import { User } from 'src/models/user.model';
import { Division } from './division.entity';

@ObjectType()
export class DivisionAssign extends BaseModel {
  userId?: number;
  divisionId?: number;
  division?: Division;
  user?: User;
  removedAt?: Date;
}
