import { ObjectType } from '@nestjs/graphql';
import RelayTypes from 'src/common/pagination/relay-types';
import { PeriodicMaintenance } from 'src/periodic-maintenance/dto/models/periodic-maintenance.model';

@ObjectType()
export class PaginatedEntityPeriodicMaintenance extends RelayTypes<PeriodicMaintenance>(
  PeriodicMaintenance
) {}
