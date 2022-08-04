import { ObjectType } from '@nestjs/graphql';
import RelayTypes from 'src/common/pagination/relay-types';
import { EntitySparePR } from '../models/entity-sparePR.model';

@ObjectType()
export class PaginatedEntitySparePR extends RelayTypes<EntitySparePR>(
  EntitySparePR
) {}
