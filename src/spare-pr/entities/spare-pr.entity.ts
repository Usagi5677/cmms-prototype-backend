import { ObjectType } from '@nestjs/graphql';
import { Entity } from 'src/entity/dto/models/entity.model';
import { BaseModel } from 'src/models/base.model';
import { User } from 'src/models/user.model';

@ObjectType()
export class SparePr extends BaseModel {
  name: string;
  requestedDate: Date;
  createdBy: User;
  entity: Entity;
}
