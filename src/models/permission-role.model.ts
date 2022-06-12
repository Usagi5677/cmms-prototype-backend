import { ObjectType } from '@nestjs/graphql';

import { BaseModel } from './base.model';
import { PermissionModel } from './permission.model';

@ObjectType()
export class PermissionRole extends BaseModel {
  roleId: number;
  permissionId: number;
  permission: PermissionModel;
}
