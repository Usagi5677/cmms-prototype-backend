import { Field, InputType, Int } from '@nestjs/graphql';

@InputType()
export class CreateTransportationAttachmentInput {
  @Field(() => Int)
  transportationId: string;
  description: string;
  @Field({ nullable: true })
  isPublic: boolean;
}
