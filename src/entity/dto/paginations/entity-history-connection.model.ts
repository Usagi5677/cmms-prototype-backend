import { ObjectType } from '@nestjs/graphql';
import RelayTypes from 'src/common/pagination/relay-types';
import { EntityHistory } from '../models/entity-history.model';

@ObjectType()
export class PaginatedEntityHistory extends RelayTypes<EntityHistory>(
  EntityHistory
) {}
