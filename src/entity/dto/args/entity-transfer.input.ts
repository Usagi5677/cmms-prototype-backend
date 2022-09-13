import { User } from 'src/models/user.model';
export class EntityTransferUserInput {
  userUuid: string;
  user: User;
  type: string;
}

export class EntityTransferInput {
  requestingUserUuid: string;
  entityId: number;
  users: EntityTransferUserInput[];
  newLocationId: number;
}
