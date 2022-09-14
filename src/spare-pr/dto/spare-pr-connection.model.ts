import { ObjectType } from '@nestjs/graphql';
import RelayTypes from 'src/common/pagination/relay-types';
import { SparePr } from '../entities/spare-pr.entity';

@ObjectType()
export class PaginatedSparePR extends RelayTypes<SparePr>(SparePr) {}
