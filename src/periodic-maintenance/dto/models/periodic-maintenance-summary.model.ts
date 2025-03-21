import { Field, ObjectType } from '@nestjs/graphql';
import { PeriodicMaintenance } from './periodic-maintenance.model';

@ObjectType()
export class PeriodicMaintenanceSummary extends PeriodicMaintenance {
  @Field({ nullable: true })
  entityId?: number;
  @Field()
  taskCompletion: string;
  @Field()
  hasObservations: boolean;
  @Field()
  hasRemarks: boolean;
  @Field()
  hasVerify: boolean;
}
