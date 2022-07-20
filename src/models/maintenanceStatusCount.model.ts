import { ObjectType } from '@nestjs/graphql';
import { BaseModel } from './base.model';
import { User } from './user.model';

@ObjectType()
export class maintenanceStatusCount {
  missed?: number;
  pending?: number;
  done?: number;
}
