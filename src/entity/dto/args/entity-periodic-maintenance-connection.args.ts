import { ArgsType } from '@nestjs/graphql';
import ConnectionArgs from 'src/common/pagination/connection-args';

@ArgsType()
export class EntityPeriodicMaintenanceConnectionArgs extends ConnectionArgs {
  search?: string;
  entityId?: number;
  complete?: boolean;
  locationIds?: number[];
  assignedToId?: number;
}
