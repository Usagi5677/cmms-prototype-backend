import { ObjectType } from '@nestjs/graphql';
import { DivisionAssign } from 'src/division/entities/division-assign.entity';
import RelayTypes from '../../common/pagination/relay-types';

@ObjectType()
export class PaginatedDivisionAssignment extends RelayTypes<DivisionAssign>(
  DivisionAssign
) {}
