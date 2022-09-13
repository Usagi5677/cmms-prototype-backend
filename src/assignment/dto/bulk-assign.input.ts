import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class BulkAssignInput {
  @Field(() => [Int])
  userIds: number[];

  @Field()
  type: string;

  @Field(() => [Int])
  entityIds: number[];
}
