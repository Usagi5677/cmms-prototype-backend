import { ObjectType } from '@nestjs/graphql';
import RelayTypes from '../../../common/pagination/relay-types';
import { Entity } from '../models/entity.model';

@ObjectType()
export class PaginatedEntity extends RelayTypes<Entity>(Entity) {}
