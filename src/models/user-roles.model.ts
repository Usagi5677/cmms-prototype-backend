import { ObjectType } from '@nestjs/graphql';
import { BaseModel } from './base.model';
import { Roles } from './roles.model';

@ObjectType()
export class UserRoles extends BaseModel {
  id: number;
  roleId: number;
  userId: number;
  role?: Roles;
}
