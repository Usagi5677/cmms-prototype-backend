import { ObjectType } from '@nestjs/graphql';

@ObjectType()
export class entityBreakdownCount {
  machine?: number;
  vehicle?: number;
  vessel?: number;
}
