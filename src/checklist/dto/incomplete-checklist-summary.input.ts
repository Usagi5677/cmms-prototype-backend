import { InputType } from '@nestjs/graphql';

@InputType()
export class IncompleteChecklistSummaryInput {
  type: string;
  from: Date;
  to: Date;
}
