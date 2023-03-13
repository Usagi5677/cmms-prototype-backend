import { InputType } from '@nestjs/graphql';

@InputType()
export class LocationAssignInput {
  userIds?: number[];
  entityIds?: number[];
  locationId?: number;
  locationIds?: number[];
  userType?: string;
  transit?: boolean;
}
