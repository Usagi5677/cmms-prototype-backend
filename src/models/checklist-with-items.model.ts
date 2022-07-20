import { Prisma } from '@prisma/client';

export type ChecklistWithItems = Prisma.ChecklistGetPayload<{
  include: {
    items: true;
  };
}>;
