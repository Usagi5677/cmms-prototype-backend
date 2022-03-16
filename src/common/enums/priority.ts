import { registerEnumType } from '@nestjs/graphql';

export enum Priority {
  High = 'High',
  Normal = 'Normal',
  Low = 'Low',
}

registerEnumType(Priority, {
  name: 'Priority',
  description: 'Ticket priorities.',
});
