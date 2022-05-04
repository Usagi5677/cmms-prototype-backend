import { registerEnumType } from '@nestjs/graphql';

export enum MachineStatus {
  Working = 'Working',
  Pending = 'Pending',
  Breakdown = 'Breakdown',
}

registerEnumType(MachineStatus, {
  name: 'MachineStatus',
  description: 'Machine statuses.',
});
