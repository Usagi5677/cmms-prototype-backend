import { InputType } from '@nestjs/graphql';

@InputType()
export class CreateInterServiceColorInput {
  typeId: number;
  brandId: number;
  measurement: string;
  greaterThan: number;
  lessThan: number;
}
