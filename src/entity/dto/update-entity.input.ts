import { InputType, Field, Int, PartialType } from '@nestjs/graphql';
import { CreateEntityInput } from './create-entity.input';

@InputType()
export class UpdateEntityInput extends PartialType(CreateEntityInput) {
  @Field(() => Int)
  id: number;
}
