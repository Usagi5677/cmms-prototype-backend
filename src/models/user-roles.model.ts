import { ObjectType } from '@nestjs/graphql';
import { PermissionEnum } from 'src/common/enums/permission';

import { BaseModel } from './base.model';
import { PermissionRole } from './permission-role.model';
import { Roles } from './roles.model';
import { User } from './user.model';

@ObjectType()
export class UserRoles extends BaseModel {
  id: number;
  roleId: number;
  userId: number;
  role?: Roles;
}
