import { InputType } from '@nestjs/graphql';

@InputType()
export class CreateBreakdownInput {
  entityId: number;
  name: string;
  type: string;
  estimatedDateOfRepair?: Date;
  details?: string[];
}
