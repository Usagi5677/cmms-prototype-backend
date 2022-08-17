import { ObjectType } from '@nestjs/graphql';
import { EntityAssign } from 'src/entity/dto/models/entity-assign.model';
import { UserRoles } from './user-roles.model';

@ObjectType()
export class UserWithRoles {
  id: number;
  rcno: number;
  fullName: string;
  userId: string;
  email: string;
  location?: string;
  roles?: UserRoles[];
  entityAssignment?: EntityAssign[];
}
