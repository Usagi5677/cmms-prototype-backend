import { ObjectType } from '@nestjs/graphql';
import RelayTypes from '../../common/pagination/relay-types';
import { EntityAssignment } from '../entities/entity-assign.model';

@ObjectType()
export class PaginatedAssignment extends RelayTypes<EntityAssignment>(
  EntityAssignment
) {}
