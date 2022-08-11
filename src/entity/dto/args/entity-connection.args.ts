import { ArgsType } from '@nestjs/graphql';
import { EntityStatus } from 'src/common/enums/entityStatus';
import ConnectionArgs from '../../../common/pagination/connection-args';

@ArgsType()
export class EntityConnectionArgs extends ConnectionArgs {
  search?: string;
  createdById?: number;
  self?: boolean;
  assignedToId?: number;
  createdByUserId?: string;
  entityType?: string;
  status?: EntityStatus;
  location?: string[];
  department?: string[];
  isAssigned?: boolean;
  typeId?: number;
}
