import { registerEnumType } from '@nestjs/graphql';

export enum Status {
  Pending = 'Pending',
  Open = 'Open',
  Closed = 'Closed',
  Solved = 'Solved',
  Reopened = 'Reopened',
}

registerEnumType(Status, {
  name: 'Status',
  description: 'Ticket statuses.',
});
