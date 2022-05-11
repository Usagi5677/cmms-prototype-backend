import { ArgsType } from '@nestjs/graphql';
import ConnectionArgs from '../../common/pagination/connection-args';

@ArgsType()
export class TransportationHistoryConnectionArgs extends ConnectionArgs {
  search?: string;
  transportationId: number;
}
