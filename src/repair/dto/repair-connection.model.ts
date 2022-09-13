import { ObjectType } from '@nestjs/graphql';
import RelayTypes from 'src/common/pagination/relay-types';
import { Repair } from '../entities/repair.entity';

@ObjectType()
export class PaginatedRepair extends RelayTypes<Repair>(Repair) {}
