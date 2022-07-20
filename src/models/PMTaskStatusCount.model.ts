import { ObjectType } from '@nestjs/graphql';
import { BaseModel } from './base.model';
import { User } from './user.model';

@ObjectType()
export class PMTaskStatusCount {
  pending?: number;
  done?: number;
}
