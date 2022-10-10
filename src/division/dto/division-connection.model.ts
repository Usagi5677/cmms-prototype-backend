import { ObjectType } from '@nestjs/graphql';
import RelayTypes from '../../common/pagination/relay-types';
import { Division } from '../entities/division.entity';

@ObjectType()
export class PaginatedDivision extends RelayTypes<Division>(Division) {}
