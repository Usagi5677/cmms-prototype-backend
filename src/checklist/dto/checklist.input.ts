import { InputType } from '@nestjs/graphql';

@InputType()
export class ChecklistInput {
  entityId: number;
  entityType: string;
  type: string;
  date: Date;
}
