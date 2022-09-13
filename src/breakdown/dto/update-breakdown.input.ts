import { CreateBreakdownInput } from './create-breakdown.input';
import { InputType, PartialType } from '@nestjs/graphql';

@InputType()
export class UpdateBreakdownInput extends PartialType(CreateBreakdownInput) {
  id: number;
}
