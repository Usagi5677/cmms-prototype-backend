import { ObjectType } from '@nestjs/graphql';
import { BaseModel } from 'src/models/base.model';
import { Zone } from 'src/zone/entities/zone.entity';

@ObjectType()
export class Location extends BaseModel {
  name: string;
  zone?: Zone;
  skipFriday?: boolean;
}
