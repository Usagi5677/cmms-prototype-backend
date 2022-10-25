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
  divisionIds?: number[];
  assignedToId?: number;
  isAssigned?: boolean;
  typeIds?: number[];
  zoneIds?: number[];
  brand?: string[];
  engine?: string[];
  measurement?: string[];
  lteInterService?: string;
  gteInterService?: string;
  isIncompleteChecklistTask?: boolean;
  entityIds?: number[];
  divisionExist?: boolean;
  locationExist?: boolean;
}
