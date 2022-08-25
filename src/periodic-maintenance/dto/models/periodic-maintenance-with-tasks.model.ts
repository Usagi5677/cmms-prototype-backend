import { Prisma } from '@prisma/client';

export type PeriodicMaintenanceWithTasks =
  Prisma.PeriodicMaintenanceGetPayload<{
    include: {
      tasks: {
        where: { parentTaskId: null };
        include: {
          subTasks: {
            include: {
              subTasks: { include: { completedBy: true } };
              completedBy: true;
            };
            orderBy: { id: 'asc' };
          };
          completedBy: true;
        };
        orderBy: { id: 'asc' };
      };
    };
  }>;
