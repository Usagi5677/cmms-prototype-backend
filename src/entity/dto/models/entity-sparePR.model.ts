import { ObjectType } from '@nestjs/graphql';
import { SparePRStatus } from 'src/common/enums/sparePRStatus';
import { BaseModel } from 'src/models/base.model';
import { User } from 'src/models/user.model';

@ObjectType()
export class EntitySparePR extends BaseModel {
  entityId: number;
  title: string;
  description: string;
  requestedDate: Date;
  completedBy?: User;
  completedAt?: Date;
  status: SparePRStatus;
}
