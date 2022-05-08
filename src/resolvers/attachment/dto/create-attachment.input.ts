import { Field, InputType, Int } from '@nestjs/graphql';

@InputType()
export class CreateMachineAttachmentInput {
  @Field(() => Int)
  machineId: string;
  description: string;
  @Field({ nullable: true })
  isPublic: boolean;
}
