import { InputType } from '@nestjs/graphql';

@InputType()
export class PeriodicMaintenanceInput {
  entityId: number;
  from: Date;
  to: Date;
}
