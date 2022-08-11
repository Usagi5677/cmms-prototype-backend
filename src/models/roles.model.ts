import { ObjectType } from '@nestjs/graphql';
import { BaseModel } from './base.model';
import { PermissionRole } from './permission-role.model';
import { User } from './user.model';

@ObjectType()
export class Roles extends BaseModel {
  createdBy: User;
  id: number;
  name: string;
  permissionRoles: PermissionRole[];
}
