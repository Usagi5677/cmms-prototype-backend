import { Field, ObjectType } from '@nestjs/graphql';
import { RoleEnum } from 'src/common/enums/roles';
import { BaseModel } from './base.model';
import { Roles } from './roles.model';
import { UserRoles } from './user-roles.model';

@ObjectType()
export class User extends BaseModel {
  rcno: number;
  fullName: string;
  userId: string;
  email: string;
  roles?: UserRoles[];
  permissions?: string[];
}
