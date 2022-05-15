import { ObjectType } from '@nestjs/graphql';
import { PermissionEnum } from 'src/common/enums/permission';

import { BaseModel } from './base.model';
import { Roles } from './roles.model';
import { User } from './user.model';

@ObjectType()
export class PermissionRole extends BaseModel {
  permission: PermissionEnum;
}
