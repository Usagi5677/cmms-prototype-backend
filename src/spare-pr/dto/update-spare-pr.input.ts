import { CreateSparePrInput } from './create-spare-pr.input';
import { InputType, Field, Int, PartialType } from '@nestjs/graphql';

@InputType()
export class UpdateSparePrInput extends PartialType(CreateSparePrInput) {
  id: number;
}
