import { ObjectType } from '@nestjs/graphql';
import RelayTypes from '../../common/pagination/relay-types';
import { DivisionAssign } from '../entities/division-assign.entity';

@ObjectType()
export class PaginatedDivisionAssign extends RelayTypes<DivisionAssign>(
  DivisionAssign
) {}
