import { ArgsType, Field } from '@nestjs/graphql';
import ConnectionArgs from '../../../common/pagination/connection-args';

@ArgsType()
export class EntityConnectionArgs extends ConnectionArgs {
  search?: string;
  createdById?: number;
  createdByUserId?: string;
  entityType?: string[];
  status?: string[];
  locationIds?: number[];
  department?: string[];
  assignedToId?: number;
  isAssigned?: boolean;
  typeIds?: number[];
  zoneIds?: number[];
  brand?: string[];
  engine?: string[];
  measurement?: string[];
  lteCurrentRunning?: string;
  gteCurrentRunning?: string;
  lteLastService?: string;
  gteLastService?: string;
  isIncompleteChecklistTask?: boolean;
}
