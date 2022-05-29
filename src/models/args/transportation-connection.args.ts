import { ArgsType } from '@nestjs/graphql';
import { TransportationStatus } from 'src/common/enums/transportationStatus';
import ConnectionArgs from '../../common/pagination/connection-args';

@ArgsType()
export class TransportationConnectionArgs extends ConnectionArgs {
  search?: string;
  createdById?: number;
  self?: boolean;
  assignedToId?: number;
  createdByUserId?: string;
  transportType?: string;
  status?: TransportationStatus;
}
