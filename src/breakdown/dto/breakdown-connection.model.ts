import { ObjectType } from '@nestjs/graphql';
import RelayTypes from 'src/common/pagination/relay-types';
import { Breakdown } from '../entities/breakdown.entity';

@ObjectType()
export class PaginatedBreakdown extends RelayTypes<Breakdown>(Breakdown) {}
