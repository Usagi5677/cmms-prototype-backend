import { registerEnumType } from '@nestjs/graphql';

export enum EntityStatus {
  Working = 'Working',
  Idle = 'Idle',
  Breakdown = 'Breakdown',
  Dispose = 'Dispose',
}

registerEnumType(EntityStatus, {
  name: 'EntityStatus',
  description: 'Entity statuses.',
});
