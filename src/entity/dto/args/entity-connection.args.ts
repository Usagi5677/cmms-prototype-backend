import { ArgsType } from '@nestjs/graphql';
import ConnectionArgs from '../../../common/pagination/connection-args';

@ArgsType()
export class EntityConnectionArgs extends ConnectionArgs {
  search?: string;
  createdById?: number;
  createdByUserId?: string;
  entityType?: string;
  status?: string[];
  locationIds?: number[];
  department?: string[];
  assignedToId?: number;
  isAssigned?: boolean;
  typeId?: number[];
  zone?: string[];
  brand?: string[];
  engine?: string[];
  measurement?: string[];
  lteCurrentRunning?: string;
  gteCurrentRunning?: string;
  lteLastService?: string;
  gteLastService?: string;
}
