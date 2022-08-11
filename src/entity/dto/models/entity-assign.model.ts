import { ObjectType } from '@nestjs/graphql';
import { BaseModel } from 'src/models/base.model';
import { User } from 'src/models/user.model';
import { Entity } from './entity.model';

@ObjectType()
export class EntityAssign extends BaseModel {
  entityId: number;
  entity?: Entity;
  userId: number;
  user?: User;
  type: string;
}
