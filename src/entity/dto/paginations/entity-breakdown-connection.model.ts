import { ObjectType } from '@nestjs/graphql';
import RelayTypes from 'src/common/pagination/relay-types';
import { EntityBreakdown } from '../models/entity-breakdown.model';

@ObjectType()
export class PaginatedEntityBreakdown extends RelayTypes<EntityBreakdown>(
  EntityBreakdown
) {}
