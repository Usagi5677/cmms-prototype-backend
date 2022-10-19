import { ObjectType } from '@nestjs/graphql';

@ObjectType()
export class pmStatusCount {
  completed?: number;
  ongoing?: number;
  upcoming?: number;
  overdue?: number;
}
