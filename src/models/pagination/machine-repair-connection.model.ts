import { ObjectType } from '@nestjs/graphql';
import RelayTypes from '../../common/pagination/relay-types';
import { MachineRepair } from '../machine-repair.model';

@ObjectType()
export class PaginatedMachineRepair extends RelayTypes<MachineRepair>(
  MachineRepair
) {}
