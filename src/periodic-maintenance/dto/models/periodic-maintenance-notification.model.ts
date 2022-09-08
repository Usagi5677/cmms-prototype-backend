import { Field, ObjectType } from '@nestjs/graphql';
import { BaseModel } from 'src/models/base.model';
import { User } from 'src/models/user.model';

@ObjectType()
export class PeriodicMaintenanceNotification extends BaseModel {
  @Field({ nullable: true })
  type: string;

  @Field({ nullable: true })
  measurement: string;

  @Field({ nullable: true })
  previousValue: number;

  @Field({ nullable: true })
  value: number;

  @Field({ nullable: true })
  periodicMaintenanceId: number;

  @Field({ nullable: true })
  originId: number;
}
