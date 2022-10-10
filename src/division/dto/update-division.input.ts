import { CreateDivisionInput } from './create-division.input';
import { InputType, PartialType } from '@nestjs/graphql';

@InputType()
export class UpdateDivisionInput extends PartialType(CreateDivisionInput) {
  id: number;
}
