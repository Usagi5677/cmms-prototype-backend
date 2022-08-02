import { CreateTypeInput } from './create-type.input';
import { InputType, Field, Int, PartialType } from '@nestjs/graphql';

@InputType()
export class UpdateTypeInput extends PartialType(CreateTypeInput) {
  @Field(() => Int)
  id: number;
}
