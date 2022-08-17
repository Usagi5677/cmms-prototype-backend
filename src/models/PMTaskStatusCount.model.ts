import { ObjectType } from '@nestjs/graphql';

@ObjectType()
export class PMTaskStatusCount {
  pending?: number;
  done?: number;
}
