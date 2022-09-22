import { ObjectType } from '@nestjs/graphql';
import { BaseModel } from 'src/models/base.model';
import { User } from 'src/models/user.model';
import { SparePr } from './spare-pr.entity';

@ObjectType()
export class SparePRDetail extends BaseModel {
  description: string;
  sparePR: SparePr;
  createdBy: User;
}
