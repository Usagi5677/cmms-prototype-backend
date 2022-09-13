import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateApiKeyInput {
  @Field()
  name: string;

  @Field(() => [String])
  permissions: string[];

  @Field({ nullable: true })
  expiresAt?: Date;
}
