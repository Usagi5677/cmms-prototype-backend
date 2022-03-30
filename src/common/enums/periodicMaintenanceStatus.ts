import { registerEnumType } from '@nestjs/graphql';

export enum PeriodicMaintenanceStatus {
  Done = 'Done',
  Pending = 'Pending',
  Missed = 'Missed',
}

registerEnumType(PeriodicMaintenanceStatus, {
  name: 'PeriodicMaintenanceStatus',
  description: 'Periodic Maintenance statuses.',
});
