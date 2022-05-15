import { ObjectType } from '@nestjs/graphql';
import { PermissionEnum } from 'src/common/enums/permission';

import { BaseModel } from './base.model';
import { PermissionRole } from './permission-role.model';
import { User } from './user.model';

@ObjectType()
export class Roles extends BaseModel {
  createdBy: User;
  name: string;
  permissionRoles: PermissionRole[];
}
