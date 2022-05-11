import { registerEnumType } from '@nestjs/graphql';

export enum TransportationStatus {
  Working = 'Working',
  Pending = 'Pending',
  Breakdown = 'Breakdown',
}

registerEnumType(TransportationStatus, {
  name: 'TransportationStatus',
  description: 'Transportation statuses.',
});
