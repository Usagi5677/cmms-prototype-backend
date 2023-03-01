import { ArgsType } from '@nestjs/graphql';
import ConnectionArgs from 'src/common/pagination/connection-args';

@ArgsType()
export class EntityPeriodicMaintenanceConnectionArgs extends ConnectionArgs {
  search?: string;
  entityId?: number;
  locationIds?: number[];
  zoneIds?: number[];
  assignedToId?: number;
  from?: Date;
  to?: Date;
}
