import { ArgsType } from '@nestjs/graphql';
import { PeriodicMaintenanceStatus } from 'src/common/enums/periodicMaintenanceStatus';
import ConnectionArgs from '../../common/pagination/connection-args';

@ArgsType()
export class MachinePeriodicMaintenanceConnectionArgs extends ConnectionArgs {
  search?: string;
  machineId?: number;
  status?: PeriodicMaintenanceStatus;
  complete?: boolean;
  location?: string[];
}
