import { CreateZoneInput } from './create-zone.input';
import { InputType, Field, Int, PartialType } from '@nestjs/graphql';

@InputType()
export class UpdateZoneInput extends PartialType(CreateZoneInput) {
  @Field(() => Int)
  id: number;
}
