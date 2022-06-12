import { ObjectType } from '@nestjs/graphql';

import { BaseModel } from './base.model';

@ObjectType()
export class PermissionModel extends BaseModel {
  id: number;
  name: string;
}
