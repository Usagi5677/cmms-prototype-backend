import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class IncompleteChecklistSummary {
  @Field()
  date: Date;

  @Field()
  count: number;
}
