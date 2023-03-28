import { InputType } from '@nestjs/graphql';

@InputType()
export class UserAssignmentBulkCreateInput {
  type?: string;
  userIds?: number[];
  locationIds?: number[];
  zoneId?: number;
}
