import { ArgsType } from '@nestjs/graphql';
import ConnectionArgs from 'src/common/pagination/connection-args';

@ArgsType()
export class PeriodicMaintenanceConnectionArgs extends ConnectionArgs {
  search?: string;
  type?: string;
  from?: Date;
  to?: Date;
  entityId?: number;
}
