import { Field, InputType, Int } from '@nestjs/graphql';

@InputType()
export class CreateEntityAttachmentInput {
  @Field(() => Int)
  entityId: string;
  description: string;
  @Field({ nullable: true })
  isPublic: boolean;
}
