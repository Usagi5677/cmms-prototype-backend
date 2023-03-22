import { ObjectType } from '@nestjs/graphql';

@ObjectType()
export class entityStatusCount {
  working?: number;
  critical?: number;
  breakdown?: number;
  dispose?: number;
  total?: number;
  machineWorking?: number;
  machineCritical?: number;
  machineBreakdown?: number;
  machineDispose?: number;
  vehicleWorking?: number;
  vehicleCritical?: number;
  vehicleBreakdown?: number;
  vehicleDispose?: number;
  vesselWorking?: number;
  vesselCritical?: number;
  vesselBreakdown?: number;
  vesselDispose?: number;
}
