import { ObjectType } from '@nestjs/graphql';
import { Division } from 'src/division/entities/division.entity';
import { BaseModel } from './base.model';
import { User } from './user.model';

@ObjectType()
export class DivisionUser extends BaseModel {
  user: User;
  division: Division;
}
