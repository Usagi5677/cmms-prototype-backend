import { ObjectType } from '@nestjs/graphql';
import { BaseModel } from 'src/models/base.model';
import { User } from 'src/models/user.model';

@ObjectType()
export class PeriodicMaintenanceComment extends BaseModel {
  type: string;
  description: string;
  createdBy?: User;
}
