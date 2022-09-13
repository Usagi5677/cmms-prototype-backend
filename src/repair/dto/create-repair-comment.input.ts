import { InputType } from '@nestjs/graphql';

@InputType()
export class CreateRepairCommentInput {
  repairId: number;
  description: string;
  type: string;
}
