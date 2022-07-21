import { ObjectType } from '@nestjs/graphql';
import { TransportationStatus } from 'src/common/enums/transportationStatus';
import { BaseModel } from './base.model';
import { ChecklistItem } from './checklist-item.model';
import { TransportationAssign } from './transportation-assign.model';
import { TransportationBreakdown } from './transportation-breakdown.model';
import { TransportationHistory } from './transportation-history.model';
import { TransportationPeriodicMaintenance } from './transportation-periodic-maintenance.model';
import { TransportationRepair } from './transportation-repair.model';
import { TransportationSparePR } from './transportation-sparePR.model';
import { User } from './user.model';

@ObjectType()
export class Transportation extends BaseModel {
  createdBy: User;
  machineNumber: string;
  registeredDate?: Date;
  model: string;
  type: string;
  location: string;
  department: string;
  engine: string;
  currentMileage?: number;
  lastServiceMileage?: number;
  measurement?: string;
  transportType?: string;
  isDeleted?: boolean;
  deletedAt?: Date;
  status?: TransportationStatus;
  statusChangedAt?: Date;
  assignees?: TransportationAssign[];
  checklistItems?: ChecklistItem[];
  periodicMaintenancePlans?: TransportationPeriodicMaintenance[];
  repairs?: TransportationRepair[];
  breakdowns?: TransportationBreakdown[];
  sparePRs?: TransportationSparePR[];
  histories?: TransportationHistory[];
}
