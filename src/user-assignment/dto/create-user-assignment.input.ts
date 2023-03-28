import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class CreateUserAssignmentInput {
  @Field()
  type: string;

  @Field({ nullable: true })
  userId: number;

  @Field({ nullable: true })
  locationId: number;

  @Field({ nullable: true })
  zoneId: number;
}
