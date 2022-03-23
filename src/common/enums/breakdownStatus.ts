import { registerEnumType } from '@nestjs/graphql';

export enum BreakdownStatus {
  Done = 'Done',
  Pending = 'Pending',
}

registerEnumType(BreakdownStatus, {
  name: 'BreakdownStatus',
  description: 'Breakdown statuses.',
});
