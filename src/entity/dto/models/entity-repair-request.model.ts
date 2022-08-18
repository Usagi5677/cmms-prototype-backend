import { ObjectType } from '@nestjs/graphql';
import { Location } from 'src/location/entities/location.entity';
import { BaseModel } from 'src/models/base.model';
import { User } from 'src/models/user.model';

@ObjectType()
export class EntityRepairRequest extends BaseModel {
  entityId: number;
  internal?: boolean;
  projectName?: string;
  location?: string;
  reason?: string;
  additionalInfo?: string;
  attendInfo?: string;
  operatorId?: number;
  supervisorId?: number;
  projectManagerId?: number;
  approverId?: number;
  repairedById?: number;
  operator?: User;
  supervisor?: User;
  projectManager?: User;
  requestedBy?: User;
  approvedBy?: User;
  repairedBy?: User;
  approvedAt?: Date;
  repairedAt?: Date;
}
