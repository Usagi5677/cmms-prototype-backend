import { InputType } from '@nestjs/graphql';

@InputType()
export class IncompleteChecklistInput {
  type: string;
  date: Date;
}
