import { CreateEngineInput } from './create-engine.input';
import { InputType, Field, Int, PartialType } from '@nestjs/graphql';

@InputType()
export class UpdateEngineInput extends PartialType(CreateEngineInput) {
  @Field(() => Int)
  id: number;
}
