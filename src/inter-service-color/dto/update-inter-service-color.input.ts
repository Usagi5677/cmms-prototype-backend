import { CreateInterServiceColorInput } from './create-inter-service-color.input';
import { InputType, Field, Int, PartialType } from '@nestjs/graphql';

@InputType()
export class UpdateInterServiceColorInput extends PartialType(
  CreateInterServiceColorInput
) {
  @Field(() => Int)
  id: number;
}
