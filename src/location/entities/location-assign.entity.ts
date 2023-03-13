import { ObjectType } from '@nestjs/graphql';
import { BaseModel } from 'src/models/base.model';
import { User } from 'src/models/user.model';
import { Location } from './location.entity';

@ObjectType()
export class LocationAssign extends BaseModel {
  userId?: number;
  locationId?: number;
  location?: Location;
  user?: User;
  userType?: string;
  removedAt?: Date;
}
