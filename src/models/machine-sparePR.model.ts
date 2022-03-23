import { ObjectType } from '@nestjs/graphql';
import { SparePRStatus } from 'src/common/enums/sparePRStatus';
import { BaseModel } from './base.model';
import { User } from './user.model';

@ObjectType()
export class MachineSparePR extends BaseModel {
  title: string;
  description: string;
  requestedDate: Date;
  completedBy?: User;
  completedAt?: Date;
  status: SparePRStatus;
}
