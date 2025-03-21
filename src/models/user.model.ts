import { Field, ObjectType } from '@nestjs/graphql';
import { BaseModel } from './base.model';
import { DivisionUser } from './division-user.model';
import { UserRoles } from './user-roles.model';

@ObjectType()
export class User extends BaseModel {
  rcno: number;
  fullName: string;
  userId: string;
  email: string;
  password: string | null;
  @Field({ nullable: true })
  locationId?: number;
  roles?: UserRoles[];
  permissions?: string[];
  divisionUsers?: DivisionUser[];
}
