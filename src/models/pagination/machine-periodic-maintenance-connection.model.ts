import { ObjectType } from '@nestjs/graphql';
import RelayTypes from '../../common/pagination/relay-types';
import { MachinePeriodicMaintenance } from '../machine-periodic-maintenance.model';

@ObjectType()
export class PaginatedMachinePeriodicMaintenance extends RelayTypes<MachinePeriodicMaintenance>(
  MachinePeriodicMaintenance
) {}
