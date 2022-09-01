import { ObjectType } from '@nestjs/graphql';

@ObjectType()
export class entityStatusCount {
  working?: number;
  critical?: number;
  breakdown?: number;
  dispose?: number;
}
