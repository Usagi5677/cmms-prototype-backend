import { ObjectType } from '@nestjs/graphql';
import { BaseModel } from 'src/models/base.model';
import { User } from 'src/models/user.model';

@ObjectType()
export class EntityAssign extends BaseModel {
  entityId: number;
  userId: number;
  user?: User;
  type: string;
}
