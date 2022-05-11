import { ObjectType } from '@nestjs/graphql';
import RelayTypes from '../../common/pagination/relay-types';
import { TransportationHistory } from '../transportation-history.model';

@ObjectType()
export class PaginatedTransportationHistory extends RelayTypes<TransportationHistory>(
  TransportationHistory
) {}
