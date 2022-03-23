import { registerEnumType } from '@nestjs/graphql';

export enum SparePRStatus {
  Done = 'Done',
  Pending = 'Pending',
}

registerEnumType(SparePRStatus, {
  name: 'SparePRStatus',
  description: 'Spare pr statuses.',
});
