import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class CreateZoneInput {
  @Field()
  name: string;
}
