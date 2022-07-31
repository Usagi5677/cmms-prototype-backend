import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Machine, Transportation } from '@prisma/client';
import { Machine as MachineModel } from 'src/models/machine.model';
import { Transportation as TransportationModel } from 'src/models/transportation.model';

@ObjectType()
export class Entity {
  @Field(() => Int)
  entityId: number;

  @Field(() => String)
  entityType: string;

  @Field(() => String)
  entityNo: string;

  @Field(() => MachineModel, { nullable: true })
  machine?: Machine;

  @Field(() => TransportationModel, { nullable: true })
  transportation?: Transportation;

  @Field({ nullable: true })
  transportationType?: string;
}
