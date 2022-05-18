import { ObjectType } from '@nestjs/graphql';
import { PermissionEnum } from 'src/common/enums/permission';

import { BaseModel } from './base.model';
import { PermissionRole } from './permission-role.model';
import { UserRoles } from './user-roles.model';
import { User } from './user.model';

@ObjectType()
export class Roles extends BaseModel {
  createdBy: User;
  id: number;
  name: string;
  permissionRoles: PermissionRole[];
}
