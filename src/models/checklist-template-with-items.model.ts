import { Prisma } from '@prisma/client';

export type ChecklistTemplateWithItems = Prisma.ChecklistTemplateGetPayload<{
  include: {
    items: true;
  };
}>;
