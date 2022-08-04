import { ArgsType } from '@nestjs/graphql';
import { PeriodicMaintenanceStatus } from 'src/common/enums/periodicMaintenanceStatus';
import ConnectionArgs from 'src/common/pagination/connection-args';

@ArgsType()
export class EntityPeriodicMaintenanceConnectionArgs extends ConnectionArgs {
  search?: string;
  entityId?: number;
  status?: PeriodicMaintenanceStatus;
  complete?: boolean;
  location?: string[];
  assignedToId?: number;
}
