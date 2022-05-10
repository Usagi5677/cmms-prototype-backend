import { ArgsType } from '@nestjs/graphql';
import ConnectionArgs from '../../common/pagination/connection-args';

@ArgsType()
export class TransportationPeriodicMaintenanceConnectionArgs extends ConnectionArgs {
  search?: string;
  transportationId: number;
}
