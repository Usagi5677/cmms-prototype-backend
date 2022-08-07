import { InputType } from '@nestjs/graphql';

@InputType()
export class ChecklistInput {
  entityId: number;
  type: string;
  date: Date;
}
