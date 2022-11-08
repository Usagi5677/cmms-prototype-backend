import { ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AllGroupedEntityUsage {
  machineNumber?: string;
  typeId?: number;
  name?: string;
  workingHour?: number;
  idleHour?: number;
  breakdownHour?: number;
  na?: number;
}
