import { ObjectType } from '@nestjs/graphql';

@ObjectType()
export class maintenanceStatusCount {
  missed?: number;
  pending?: number;
  done?: number;
}
