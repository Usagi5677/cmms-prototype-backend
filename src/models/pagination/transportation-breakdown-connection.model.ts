import { ObjectType } from '@nestjs/graphql';
import RelayTypes from '../../common/pagination/relay-types';
import { TransportationBreakdown } from '../transportation-breakdown.model';

@ObjectType()
export class PaginatedTransportationBreakdown extends RelayTypes<TransportationBreakdown>(
  TransportationBreakdown
) {}
