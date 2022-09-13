import { InputType } from '@nestjs/graphql';

@InputType()
export class CreateBreakdownCommentInput {
  breakdownId?: number;
  detailId?: number;
  description: string;
  type: string;
}
