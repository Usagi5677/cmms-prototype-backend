import { ObjectType } from '@nestjs/graphql';
import { Location } from 'src/location/entities/location.entity';
import { BaseModel } from 'src/models/base.model';
import { User } from 'src/models/user.model';
import { Zone } from 'src/zone/entities/zone.entity';

@ObjectType()
export class UserAssignment extends BaseModel {
  type: string;
  user?: User;
  location?: Location;
  zone?: Zone;
}
