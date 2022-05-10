import { ObjectType } from '@nestjs/graphql';
import RelayTypes from '../../common/pagination/relay-types';
import { TransportationPeriodicMaintenance } from '../transportation-periodic-maintenance.model';

@ObjectType()
export class PaginatedTransportationPeriodicMaintenance extends RelayTypes<TransportationPeriodicMaintenance>(
  TransportationPeriodicMaintenance
) {}
