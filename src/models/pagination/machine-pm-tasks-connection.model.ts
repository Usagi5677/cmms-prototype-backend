import { ObjectType } from '@nestjs/graphql';
import RelayTypes from '../../common/pagination/relay-types';
import { MachinePMTask } from '../machine-PM-task.model';

@ObjectType()
export class PaginatedMachinePeriodicMaintenanceTask extends RelayTypes<MachinePMTask>(
  MachinePMTask
) {}
