import { ObjectType } from '@nestjs/graphql';

@ObjectType()
export class configCount {
  location?: number;
  zone?: number;
  division?: number;
  hullType?: number;
  brand?: number;
  engine?: number;
}
