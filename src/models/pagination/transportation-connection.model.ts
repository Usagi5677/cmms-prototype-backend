import { ObjectType } from '@nestjs/graphql';
import RelayTypes from '../../common/pagination/relay-types';
import { Transportation } from '../transportation.model';

@ObjectType()
export class PaginatedTransportation extends RelayTypes<Transportation>(
  Transportation
) {}
