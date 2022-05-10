import { ObjectType } from '@nestjs/graphql';
import RelayTypes from '../../common/pagination/relay-types';
import { TransportationSparePR } from '../transportation-sparePR.model';

@ObjectType()
export class PaginatedTransportationSparePR extends RelayTypes<TransportationSparePR>(
  TransportationSparePR
) {}
