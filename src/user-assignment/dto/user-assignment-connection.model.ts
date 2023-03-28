import { ObjectType } from '@nestjs/graphql';
import RelayTypes from '../../common/pagination/relay-types';
import { UserAssignment } from '../entities/user-assignment.entity';

@ObjectType()
export class PaginatedUserAssignment extends RelayTypes<UserAssignment>(
  UserAssignment
) {}
