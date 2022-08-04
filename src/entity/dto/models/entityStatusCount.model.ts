import { ObjectType } from '@nestjs/graphql';

@ObjectType()
export class entityStatusCount {
  working?: number;
  idle?: number;
  breakdown?: number;
  dispose?: number;
}
