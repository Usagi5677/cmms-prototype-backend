import { InputType } from '@nestjs/graphql';

@InputType()
export class ChecklistSummaryInput {
  entityId: number;
  entityType: string;
  type: string;
  from: Date;
  to: Date;
}
