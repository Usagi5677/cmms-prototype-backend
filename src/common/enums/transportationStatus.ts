import { registerEnumType } from '@nestjs/graphql';

export enum TransportationStatus {
  Working = 'Working',
  Idle = 'Idle',
  Breakdown = 'Breakdown',
}

registerEnumType(TransportationStatus, {
  name: 'TransportationStatus',
  description: 'Transportation statuses.',
});
