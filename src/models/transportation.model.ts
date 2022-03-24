import { ObjectType } from '@nestjs/graphql';
import { MachineStatus } from 'src/common/enums/machineStatus';
import { BaseModel } from './base.model';
import { ChecklistItem } from './checklist-item.model';
import { MachineBreakdown } from './machine-breakdown.model';
import { MachineHistory } from './machine-history.model';
import { MachineRepair } from './machine-repair.model';
import { MachineSparePR } from './machine-sparePR.model';
import { PeriodicMaintenance } from './periodic-maintenance.model';
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
  currentMileage: number;
  lastServicMileage: number;
  interServiceMileage: number;
  measurement?: string;
  status: MachineStatus;
  statusChangedAt?: Date;
  assignees: User[];
  checklistItems: ChecklistItem[];
  periodicMaintenancePlans: PeriodicMaintenance[];
  repairs: MachineRepair[];
  breakdowns: MachineBreakdown[];
  sparePRs: MachineSparePR[];
  histories: MachineHistory[];
}
