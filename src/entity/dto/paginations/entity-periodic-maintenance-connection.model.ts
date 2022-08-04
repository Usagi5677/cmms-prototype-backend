import { ObjectType } from '@nestjs/graphql';
import RelayTypes from 'src/common/pagination/relay-types';
import { EntityPeriodicMaintenance } from '../models/entity-periodic-maintenance.model';

@ObjectType()
export class PaginatedEntityPeriodicMaintenance extends RelayTypes<EntityPeriodicMaintenance>(
  EntityPeriodicMaintenance
) {}
