import { ObjectType } from '@nestjs/graphql';
import RelayTypes from '../../common/pagination/relay-types';
import { TransportationRepair } from '../transportation-repair.model';

@ObjectType()
export class PaginatedTransportationRepair extends RelayTypes<TransportationRepair>(
  TransportationRepair
) {}
