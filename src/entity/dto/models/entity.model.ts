import { ObjectType } from '@nestjs/graphql';
import { EntityStatus } from 'src/common/enums/entityStatus';
import { Location } from 'src/location/entities/location.entity';
import { BaseModel } from 'src/models/base.model';
import { ChecklistItem } from 'src/models/checklist-item.model';
import { User } from 'src/models/user.model';
import { PeriodicMaintenance } from 'src/periodic-maintenance/dto/models/periodic-maintenance.model';
import { Type } from 'src/type/entities/type.entity';
import { EntityAssign } from './entity-assign.model';
import { EntityBreakdown } from './entity-breakdown.model';
import { EntityHistory } from './entity-history.model';
import { EntityPeriodicMaintenance } from './entity-periodic-maintenance.model';
import { EntityRepairRequest } from './entity-repair-request.model';
import { EntitySparePR } from './entity-sparePR.model';

@ObjectType()
export class Entity extends BaseModel {
  createdBy?: User;
  type?: Type;
  machineNumber?: string;
  registeredDate?: Date;
  model?: string;
  zone?: string;
  location?: Location;
  department?: string;
  engine?: string;
  currentRunning?: number;
  lastService?: number;
  measurement?: string;
  brand?: string;
  isDeleted?: boolean;
  deletedAt?: Date;
  status?: EntityStatus;
  statusChangedAt?: Date;
  assignees?: EntityAssign[];
  checklistItems?: ChecklistItem[];
  periodicMaintenancePlans?: EntityPeriodicMaintenance[];
  repairs?: EntityRepairRequest[];
  breakdowns?: EntityBreakdown[];
  sparePRs?: EntitySparePR[];
  histories?: EntityHistory[];
  periodicMaintenances?: PeriodicMaintenance[];
}
