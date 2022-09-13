import { ObjectType } from '@nestjs/graphql';
import { BaseModel } from 'src/models/base.model';
import { User } from 'src/models/user.model';

@ObjectType()
export class RepairComment extends BaseModel {
  description: string;
  type: string;
  createdBy?: User;
}
