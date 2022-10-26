import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class BulkUnassignInput {
  @Field(() => [Int])
  userIds: number[];

  @Field()
  type: string;

  @Field(() => [Int])
  entityIds: number[];
}
