import { ObjectType } from '@nestjs/graphql';
import RelayTypes from '../../common/pagination/relay-types';
import { Brand } from '../entities/brand.entity';

@ObjectType()
export class PaginatedBrand extends RelayTypes<Brand>(Brand) {}
