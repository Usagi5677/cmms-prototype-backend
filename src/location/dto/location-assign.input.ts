import { InputType } from '@nestjs/graphql';

@InputType()
export class LocationAssignInput {
  userIds?: number[];
  entityIds?: number[];
  locationId: number;
  transit?: boolean;
}
