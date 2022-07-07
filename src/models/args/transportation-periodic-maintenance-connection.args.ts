import { ArgsType } from '@nestjs/graphql';
import { PeriodicMaintenanceStatus } from 'src/common/enums/periodicMaintenanceStatus';
import ConnectionArgs from '../../common/pagination/connection-args';

@ArgsType()
export class TransportationPeriodicMaintenanceConnectionArgs extends ConnectionArgs {
  search?: string;
  transportationId?: number;
  status?: PeriodicMaintenanceStatus;
}
