import { ObjectType } from '@nestjs/graphql';
import RelayTypes from 'src/common/pagination/relay-types';
import { EntityRepair } from '../models/entity-repair.model';

@ObjectType()
export class PaginatedEntityRepair extends RelayTypes<EntityRepair>(
  EntityRepair
) {}
