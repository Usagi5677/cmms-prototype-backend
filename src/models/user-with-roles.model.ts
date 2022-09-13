import { ObjectType } from '@nestjs/graphql';
import { EntityAssignment } from 'src/assignment/entities/entity-assign.model';
import { Location } from 'src/location/entities/location.entity';
import { UserRoles } from './user-roles.model';

@ObjectType()
export class UserWithRoles {
  id: number;
  rcno: number;
  fullName: string;
  userId: string;
  email: string;
  location?: Location;
  roles?: UserRoles[];
  entityAssignment?: EntityAssignment[];
}
