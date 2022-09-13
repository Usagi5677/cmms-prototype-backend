import { InputType } from '@nestjs/graphql';

@InputType()
export class CreateBreakdownDetailInput {
  breakdownId?: number;
  description: string;
}
