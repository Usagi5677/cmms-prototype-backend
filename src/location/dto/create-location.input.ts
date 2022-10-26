import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class CreateLocationInput {
  @Field()
  name: string;

  @Field({ nullable: true })
  zoneId: number;

  @Field({ nullable: true })
  skipFriday: boolean;
}
