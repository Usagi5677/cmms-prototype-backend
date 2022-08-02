import { ObjectType } from '@nestjs/graphql';
import RelayTypes from '../../common/pagination/relay-types';
import { Type } from '../entities/type.entity';

@ObjectType()
export class PaginatedType extends RelayTypes<Type>(Type) {}
