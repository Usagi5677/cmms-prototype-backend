import { ObjectType } from '@nestjs/graphql';
import RelayTypes from '../../common/pagination/relay-types';
import { TransportationAttachment } from '../transportation-attachment.model';

@ObjectType()
export class PaginatedTransportationAttachment extends RelayTypes<TransportationAttachment>(
  TransportationAttachment
) {}
