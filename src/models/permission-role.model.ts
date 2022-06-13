import { ObjectType } from '@nestjs/graphql';
import { BaseModel } from './base.model';

@ObjectType()
export class PermissionRole extends BaseModel {
  roleId: number;
  permission: string;
}
