import { ObjectType } from '@nestjs/graphql';
import { EntityAssignment } from 'src/assignment/entities/entity-assign.model';
import { Breakdown } from 'src/breakdown/entities/breakdown.entity';
import { Location } from 'src/location/entities/location.entity';
import { BaseModel } from 'src/models/base.model';
import { ChecklistItem } from 'src/models/checklist-item.model';
import { User } from 'src/models/user.model';
import { PeriodicMaintenance } from 'src/periodic-maintenance/dto/models/periodic-maintenance.model';
import { Type } from 'src/type/entities/type.entity';
import { EntityHistory } from './entity-history.model';
import { EntityPeriodicMaintenance } from './entity-periodic-maintenance.model';
import { SparePr } from 'src/spare-pr/entities/spare-pr.entity';
import { Repair } from 'src/repair/entities/repair.entity';

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
  deletedAt?: Date;
  status?: string;
  statusChangedAt?: Date;
  assignees?: EntityAssignment[];
  checklistItems?: ChecklistItem[];
  periodicMaintenancePlans?: EntityPeriodicMaintenance[];
  repairs?: Repair[];
  breakdowns?: Breakdown[];
  sparePRs?: SparePr[];
  histories?: EntityHistory[];
  periodicMaintenances?: PeriodicMaintenance[];
  parentEntityId?: number;
  subEntities?: Entity[];
}
