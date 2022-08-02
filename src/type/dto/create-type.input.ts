import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class CreateTypeInput {
  @Field()
  entityType: string;

  @Field()
  name: string;
}
