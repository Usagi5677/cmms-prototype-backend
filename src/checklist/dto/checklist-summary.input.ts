import { InputType } from '@nestjs/graphql';

@InputType()
export class ChecklistSummaryInput {
  entityId: number;
  type: string;
  from: Date;
  to: Date;
}
