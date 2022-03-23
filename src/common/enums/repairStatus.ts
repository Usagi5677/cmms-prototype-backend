import { registerEnumType } from '@nestjs/graphql';

export enum RepairStatus {
  Done = 'Done',
  Pending = 'Pending',
}

registerEnumType(RepairStatus, {
  name: 'RepairStatus',
  description: 'Repair statuses.',
});
