import { ObjectType } from '@nestjs/graphql';

@ObjectType()
export class UserWithRoles {
  id: number;
  rcno: number;
  fullName: string;
  userId: string;
  email: string;
  roles: string[];
}
