import { ObjectType } from '@nestjs/graphql';
import RelayTypes from '../../common/pagination/relay-types';
import { MachineBreakdown } from '../machine-breakdown.model';

@ObjectType()
export class PaginatedTransportationBreakdown extends RelayTypes<MachineBreakdown>(
  MachineBreakdown
) {}
