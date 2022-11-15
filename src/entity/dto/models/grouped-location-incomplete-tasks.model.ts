import { ObjectType } from '@nestjs/graphql';

@ObjectType()
export class GroupedLocationIncompleteTasks {
  locationId?: number;
  name?: string;
  incompleteTask?: number;
  completeTask?: number;
  count?: number;
  total?: number;
}
