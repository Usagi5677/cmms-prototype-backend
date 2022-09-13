import { ObjectType } from '@nestjs/graphql';
import { BaseModel } from 'src/models/base.model';
import { User } from 'src/models/user.model';
import { ApiKeyPermission } from './api-key-permission';

@ObjectType()
export class ApiKey extends BaseModel {
  name: string;
  apiKeyStart: string;
  calls: number;
  createdBy?: User;
  active: boolean;
  expiresAt?: Date;
  permissions?: ApiKeyPermission[];
}
