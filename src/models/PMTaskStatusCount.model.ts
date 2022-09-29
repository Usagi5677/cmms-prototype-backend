import { ObjectType } from '@nestjs/graphql';

@ObjectType()
export class PMTaskStatusCount {
  ongoing?: number;
  complete?: number;
}
