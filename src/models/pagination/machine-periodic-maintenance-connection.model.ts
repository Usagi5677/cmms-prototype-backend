import { ObjectType } from '@nestjs/graphql';
import RelayTypes from '../../common/pagination/relay-types';
import { MachineRepair } from '../machine-repair.model';
import { PeriodicMaintenance } from '../periodic-maintenance.model';

@ObjectType()
export class PaginatedMachinePeriodicMaintenance extends RelayTypes<PeriodicMaintenance>(
  PeriodicMaintenance
) {}
