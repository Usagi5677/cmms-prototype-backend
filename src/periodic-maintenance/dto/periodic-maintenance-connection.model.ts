import { ObjectType } from '@nestjs/graphql';
import RelayTypes from 'src/common/pagination/relay-types';
import { PeriodicMaintenance } from './models/periodic-maintenance.model';

@ObjectType()
export class PeriodicMaintenanceConnection extends RelayTypes<PeriodicMaintenance>(
  PeriodicMaintenance
) {}
