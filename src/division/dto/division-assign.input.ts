import { InputType } from '@nestjs/graphql';

@InputType()
export class DivisionAssignInput {
  userIds?: number[];
  divisionId: number;
}
