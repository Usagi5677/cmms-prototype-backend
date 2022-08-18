import { ObjectType } from '@nestjs/graphql';
import { EntityAssign } from 'src/entity/dto/models/entity-assign.model';
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
  entityAssignment?: EntityAssign[];
}
