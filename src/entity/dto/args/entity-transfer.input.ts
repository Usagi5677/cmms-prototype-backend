import { InputType, Field } from '@nestjs/graphql';
import { User } from 'src/models/user.model';

@InputType()
class EntityTransferUserInputGQL {
  @Field()
  userUuid: string;
  @Field()
  type: string;
}

export class EntityTransferUserInput {
  userUuid: string;
  user: User;
  type: string;
}

@InputType()
export class EntityTransferInput {
  @Field()
  entityId: number;

  @Field(() => [EntityTransferUserInputGQL], { nullable: true })
  users: EntityTransferUserInput[];

  @Field()
  newLocationId: number;
}
