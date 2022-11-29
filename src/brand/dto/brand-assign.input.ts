import { InputType } from '@nestjs/graphql';

@InputType()
export class BrandAssignInput {
  userIds?: number[];
  entityIds?: number[];
  brandId: number;
}
