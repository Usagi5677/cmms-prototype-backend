import { InputType } from '@nestjs/graphql';

@InputType()
export class CreateSparePRDetailInput {
  sparePRId?: number;
  description: string;
}
