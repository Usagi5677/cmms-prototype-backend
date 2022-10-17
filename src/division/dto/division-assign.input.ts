import { InputType } from '@nestjs/graphql';

@InputType()
export class DivisionAssignInput {
  userIds?: number[];
  entityIds?: number[];
  divisionId: number;
}
