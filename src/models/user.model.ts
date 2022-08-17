import { Field, ObjectType } from '@nestjs/graphql';
import { BaseModel } from './base.model';
import { UserRoles } from './user-roles.model';

@ObjectType()
export class User extends BaseModel {
  rcno: number;
  fullName: string;
  userId: string;
  email: string;
  @Field({ nullable: true })
  location: string;
  roles?: UserRoles[];
  permissions?: string[];
}
