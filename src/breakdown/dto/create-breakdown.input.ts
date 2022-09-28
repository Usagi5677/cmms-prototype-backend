import { InputType } from '@nestjs/graphql';

@InputType()
export class CreateBreakdownInput {
  entityId: number;
  type: string;
  estimatedDateOfRepair?: Date;
  details?: string[];
}
