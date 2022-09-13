import { Field, InputType, Int } from '@nestjs/graphql';

@InputType()
export class EditApiKeyInput {
  @Field(() => Int)
  keyId: number;

  @Field({ nullable: true })
  name: string;

  @Field(() => [String], { nullable: true })
  permissions: string[];
}
