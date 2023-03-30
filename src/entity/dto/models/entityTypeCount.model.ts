import { ObjectType } from '@nestjs/graphql';

@ObjectType()
export class entityTypeCount {
  machine?: number;
  vehicle?: number;
  vessel?: number;
  subEntity?: number;
  total?: number;
}
