import { CreateUserAssignmentInput } from './create-user-assignment.input';
import { InputType, Field, Int, PartialType } from '@nestjs/graphql';

@InputType()
export class UpdateUserAssignmentInput extends PartialType(
  CreateUserAssignmentInput
) {
  @Field(() => Int)
  id: number;
}
