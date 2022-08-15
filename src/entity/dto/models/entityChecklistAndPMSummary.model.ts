import { ObjectType } from '@nestjs/graphql';

@ObjectType()
export class entityChecklistAndPMSummary {
  pm?: string[];
  checklist?: string[];
  machineTaskComplete?: boolean;
  machineChecklistComplete?: boolean;
  vehicleTaskComplete?: boolean;
  vehicleChecklistComplete?: boolean;
  vesselTaskComplete?: boolean;
  vesselChecklistComplete?: boolean;
}
