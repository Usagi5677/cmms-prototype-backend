import { Field, ObjectType } from '@nestjs/graphql';
import { BaseModel } from './base.model';

@ObjectType()
export class MachineUsage {
  @Field()
  currentRunningHrs: number;

  @Field()
  lastServiceHrs: number;

  @Field({ nullable: true, name: 'date' })
  createdAt?: Date;

  interServiceHrs?: number;
}
