import { Field, InputType, Int } from '@nestjs/graphql';

@InputType()
export class CreateEntityAttachmentInput {
  userUuid?: string;
  @Field(() => Int)
  entityId: string;
  description: string;
  @Field({ nullable: true })
  checklistId: string;
}
