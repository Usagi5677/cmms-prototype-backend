import { CreateHullTypeInput } from './create-hull-type.input';
import { InputType, Field, Int, PartialType } from '@nestjs/graphql';

@InputType()
export class UpdateHullTypeInput extends PartialType(CreateHullTypeInput) {
  @Field(() => Int)
  id: number;
}
