import { registerEnumType } from '@nestjs/graphql';

export enum MachineStatus {
  Working = 'Working',
  Idle = 'Idle',
  Breakdown = 'Breakdown',
  Dispose = 'Dispose',
}

registerEnumType(MachineStatus, {
  name: 'MachineStatus',
  description: 'Machine statuses.',
});
