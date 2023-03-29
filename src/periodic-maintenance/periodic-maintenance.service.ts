import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import * as moment from 'moment';
import { PeriodicMaintenance as PeriodicMaintenanceModel } from './dto/models/periodic-maintenance.model';
import { EntityService } from 'src/entity/entity.service';
import { PeriodicMaintenanceInput } from './dto/inputs/periodic-maintenance.input';
import { User } from 'src/models/user.model';
import { PeriodicMaintenance } from '@prisma/client';
import { PeriodicMaintenanceConnectionArgs } from './dto/periodic-maintenance.connection.args';
import { PeriodicMaintenanceConnection } from './dto/periodic-maintenance-connection.model';
import { UserService } from 'src/services/user.service';
import {
  connectionFromArraySlice,
  getPagingParameters,
} from 'src/common/pagination/connection-args';
import { NotificationService } from 'src/services/notification.service';
import { PeriodicMaintenanceWithTasks } from './dto/models/periodic-maintenance-with-tasks.model';
import { ForbiddenError } from 'apollo-server-express';
import { PeriodicMaintenanceSummary } from './dto/models/periodic-maintenance-summary.model';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from 'src/prisma/prisma.service';
import { Entity } from 'src/entity/dto/models/entity.model';
import { PaginatedEntity } from 'src/entity/dto/paginations/entity-connection.model';

export interface UpdatePMTaskInterface {
  pm: PeriodicMaintenanceWithTasks;
  copyPM: PeriodicMaintenanceWithTasks | PeriodicMaintenanceModel;
  isDay?: boolean;
}

@Injectable()
export class PeriodicMaintenanceService {
  private readonly logger = new Logger(PeriodicMaintenanceService.name);
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => EntityService))
    private entityService: EntityService,
    private userService: UserService,
    private notificationService: NotificationService,
    @InjectQueue('cmms-pm-queue')
    private pmQueue: Queue
  ) {}

  async findOne({ entityId, from, to }: PeriodicMaintenanceInput) {
    try {
      await this.entityService.findOne(entityId);
      let periodicMaintenance: null | PeriodicMaintenance = null;
      from = moment(from).toDate();
      to = moment(to).toDate();

      periodicMaintenance = await this.prisma.periodicMaintenance.findFirst({
        where: {
          entityId,
          from,
          to,
        },
        include: {
          tasks: {
            include: {
              completedBy: true,
              remarks: { include: { createdBy: true } },
            },
            orderBy: { id: 'asc' },
          },
          comments: {
            where: { type: 'Comment' },
            include: {
              createdBy: true,
            },
            orderBy: { id: 'desc' },
          },
        },
      });
      return periodicMaintenance;
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async findAll(
    user: User,
    args: PeriodicMaintenanceConnectionArgs
  ): Promise<PeriodicMaintenanceConnection> {
    try {
      const { limit, offset } = getPagingParameters(args);
      const limitPlusOne = limit + 1;
      const { search, type, from, to, entityId } = args;
      const fromDate = moment(from).startOf('day');
      const toDate = moment(to).endOf('day');
      const where: any = {};

      where.removedAt = null;

      if (search) {
        where.name = { contains: search, mode: 'insensitive' };
      }
      if (type) {
        where.type = type;
      }

      if (from && to) {
        where.createdAt = { gte: fromDate.toDate(), lte: toDate.toDate() };
      }

      if (entityId) {
        where.entityId = entityId;
      }

      const pm = await this.prisma.periodicMaintenance.findMany({
        skip: offset,
        take: limitPlusOne,
        where,
        include: {
          notificationReminder: true,
          tasks: {
            where: { parentTaskId: null },
            include: {
              subTasks: {
                include: {
                  subTasks: {
                    include: {
                      completedBy: true,
                      remarks: {
                        include: {
                          createdBy: true,
                        },
                      },
                    },
                    orderBy: { id: 'asc' },
                  },
                  completedBy: true,
                  remarks: {
                    include: {
                      createdBy: true,
                    },
                  },
                },
                orderBy: { id: 'asc' },
              },
              completedBy: true,
              remarks: {
                include: {
                  createdBy: true,
                },
              },
            },
            orderBy: { id: 'asc' },
          },
          verifiedBy: true,
          comments: {
            include: {
              createdBy: true,
            },
          },
        },
        orderBy: { id: 'desc' },
      });

      const count = await this.prisma.periodicMaintenance.count({ where });
      const { edges, pageInfo } = connectionFromArraySlice(
        pm.slice(0, limit),
        args,
        {
          arrayLength: count,
          sliceStart: offset,
        }
      );
      return {
        edges,
        pageInfo: {
          ...pageInfo,
          count,
          hasNextPage: offset + limit < count,
          hasPreviousPage: offset >= limit,
        },
      };
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async upcomingPeriodicMaintenances(
    user: User,
    args: PeriodicMaintenanceConnectionArgs
  ): Promise<PeriodicMaintenanceConnection> {
    try {
      const { limit, offset } = getPagingParameters(args);
      const limitPlusOne = limit + 1;
      const { search, type, from, to, entityId } = args;
      const fromDate = moment(from).startOf('day');
      const toDate = moment(to).endOf('day');
      const where: any = {};

      where.removedAt = null;

      if (search) {
        where.name = { contains: search, mode: 'insensitive' };
      }
      if (type) {
        where.type = type;
      }

      if (from && to) {
        where.createdAt = { gte: fromDate.toDate(), lte: toDate.toDate() };
      }

      if (entityId) {
        where.entityId = entityId;
      }

      const tempPM = await this.prisma.periodicMaintenance.findMany({
        skip: offset,
        take: limitPlusOne,
        where,
        orderBy: { id: 'desc' },
        include: {
          entity: {
            include: {
              type: {
                include: {
                  interServiceColor: { include: { brand: true, type: true } },
                },
              },
              brand: true,
            },
          },
        },
      });
      const newPeriodicMaintenances = [];
      for (const p of tempPM) {
        const interService =
          (p?.entity?.currentRunning ? p?.entity?.currentRunning : 0) -
          (p?.entity?.lastService ? p?.entity?.lastService : 0);
        if (p?.entity?.type?.interServiceColor.length > 0) {
          for (const intColor of p.entity?.type?.interServiceColor) {
            if (
              intColor?.brand?.name === p?.entity?.brand?.name &&
              intColor?.type?.name === p?.entity?.type?.name &&
              intColor?.measurement === p?.entity?.measurement
            ) {
              if (
                interService >= intColor?.lessThan &&
                interService <= intColor?.greaterThan
              ) {
                newPeriodicMaintenances.push(p);
              }
            }
          }
        }
      }
      const newPeriodicMaintenanceIds = newPeriodicMaintenances?.map(
        (p) => p.id
      );
      const pm = await this.prisma.periodicMaintenance.findMany({
        skip: offset,
        take: limitPlusOne,
        where: {
          id: { in: newPeriodicMaintenanceIds },
        },
        include: {
          tasks: {
            where: { parentTaskId: null },
            include: {
              subTasks: {
                include: {
                  subTasks: {
                    orderBy: { id: 'asc' },
                  },
                },
                orderBy: { id: 'asc' },
              },
            },
            orderBy: { id: 'asc' },
          },
        },
        orderBy: { id: 'desc' },
      });

      const count = await this.prisma.periodicMaintenance.count({ where });
      const { edges, pageInfo } = connectionFromArraySlice(
        pm.slice(0, limit),
        args,
        {
          arrayLength: count,
          sliceStart: offset,
        }
      );
      return {
        edges,
        pageInfo: {
          ...pageInfo,
          count,
          hasNextPage: offset + limit < count,
          hasPreviousPage: offset >= limit,
        },
      };
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** get all templates of origin id of periodic maintenance. */
  async getAllTemplatesOfOriginPM(
    user: User,
    id: number
  ): Promise<PeriodicMaintenance[]> {
    try {
      return await this.prisma.periodicMaintenance.findMany({
        where: {
          originId: id,
          type: 'Template',
          removedAt: null,
        },
        include: {
          entity: {
            include: {
              type: true,
              location: { include: { zone: true } },
            },
          },
        },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async createPeriodicMaintenance(
    user: User,
    name?: string,
    measurement?: string,
    value?: number,
    currentMeterReading?: number,
    recur?: boolean
  ) {
    try {
      await this.prisma.periodicMaintenance.create({
        data: {
          name,
          measurement,
          value: recur ? value : null,
          currentMeterReading,
          type: 'Origin',
          recur,
        },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async editPeriodicMaintenance(
    user: User,
    id?: number,
    name?: string,
    measurement?: string,
    value?: number,
    currentMeterReading?: number,
    recur?: boolean
  ) {
    try {
      const pm = await this.prisma.periodicMaintenance.findFirst({
        where: { id },
      });
      await this.prisma.periodicMaintenance.update({
        where: {
          id,
        },
        data: {
          name,
          measurement,
          value: recur ? value : null,
          currentMeterReading,
          recur,
        },
      });
      if (pm.type === 'Origin') {
        this.updatePeriodicMaintenanceTemplates(pm.id, true, false);
      }
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Set task as complete or incomplete. */
  async togglePeriodicMaintenanceTask(
    user: User,
    id: number,
    complete: boolean
  ) {
    try {
      const completion = complete
        ? { completedById: user.id, completedAt: new Date() }
        : { completedById: null, completedAt: null };
      const transactions: any = [
        this.prisma.periodicMaintenanceTask.update({
          where: { id },
          data: completion,
        }),
      ];
      const subTasks = await this.prisma.periodicMaintenanceTask.findMany({
        where: { parentTaskId: id },
        select: { id: true },
      });
      const subTaskIds = subTasks.map((st) => st.id);
      if (subTaskIds.length > 0) {
        transactions.push(
          this.prisma.periodicMaintenanceTask.updateMany({
            where: {
              OR: [
                { id: { in: subTaskIds } },
                { parentTaskId: { in: subTaskIds } },
              ],
            },
            data: completion,
          })
        );
      }
      await this.prisma.$transaction(transactions);
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Create periodic maintenance task. */
  async createPeriodicMaintenanceTask(
    user: User,
    periodicMaintenanceId: number,
    name: string,
    parentTaskId?: number
  ) {
    try {
      const pm = await this.prisma.periodicMaintenance.findFirst({
        where: { id: periodicMaintenanceId },
      });
      await this.prisma.periodicMaintenanceTask.create({
        data: {
          parentTaskId,
          periodicMaintenanceId,
          name,
        },
      });
      if (pm.type === 'Origin') {
        this.updatePeriodicMaintenanceTemplates(pm.id, false, true);
      }
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Delete task. */
  async deletePeriodicMaintenanceTask(user: User, id: number) {
    try {
      const pmTask = await this.prisma.periodicMaintenanceTask.findFirst({
        where: { id },
        select: { periodicMaintenanceId: true },
      });
      const pm = await this.prisma.periodicMaintenance.findFirst({
        where: { id: pmTask.periodicMaintenanceId },
      });
      await this.prisma.periodicMaintenanceTask.delete({
        where: { id },
      });
      if (pm.type === 'Origin') {
        this.updatePeriodicMaintenanceTemplates(pm.id, false, true);
      }
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Set periodic maintenance as verified or unverified. */
  async toggleVerifyPeriodicMaintenance(
    user: User,
    id: number,
    verify: boolean
  ) {
    try {
      const pm = await this.prisma.periodicMaintenance.findFirst({
        where: { id },
        include: { entity: true },
      });

      await this.prisma.periodicMaintenance.update({
        where: { id },
        data: verify
          ? {
              verifiedById: user.id,
              verifiedAt: new Date(),
              status: 'Completed',
            }
          : { verifiedById: null, verifiedAt: null, status: 'Ongoing' },
      });

      /*
      const reading = await this.entityService.getLatestReading(pm.entity);

      //update copy with new values. (Not necessary to update previous reading for copies)
      await this.prisma.periodicMaintenance.update({
        where: { id },
        data: verify
          ? { currentMeterReading: reading }
          : { currentMeterReading: null },
      });

      //update the template as well so that it will make copy when it fulfills the requirement
      await this.prisma.periodicMaintenance.update({
        where: {
          id: pm.originId,
        },
        data: {
          currentMeterReading: reading,
        },
      });

      //update last service to currentReading
      if (verify) {
        await this.prisma.entity.update({
          where: { id: pm.entityId },
          data: { lastService: reading },
        });
      }
      */
      const users = await this.entityService.getEntityAssignmentIds(
        pm.entityId,
        user.id
      );
      for (let index = 0; index < users.length; index++) {
        await this.notificationService.createInBackground({
          userId: users[index],
          body: `${user.fullName} (${user.rcno}) ${
            verify ? 'verified' : 'unverified'
          } periodic maintenance (${id}) on entity ${pm.entityId}`,
          link: `/entity/${pm.entityId}`,
        });
      }
      await this.entityService.createEntityHistoryInBackground({
        type: 'Periodic maintenance verify',
        description: verify
          ? `Periodic maintenance (${id}) has been verified to be completed.`
          : `Periodic maintenance (${id}) has been unverified.`,
        entityId: pm.entityId,
        completedById: user?.id,
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  // Update all templates (after origin is changed)
  async updatePeriodicMaintenanceTemplates(
    originId: number,
    pmIncluded?: boolean,
    taskIncluded?: boolean
  ) {
    try {
      const originPM = await this.prisma.periodicMaintenance.findFirst({
        where: {
          id: originId,
          type: 'Origin',
        },
        include: {
          tasks: {
            where: { parentTaskId: null },
            include: {
              subTasks: {
                include: {
                  subTasks: { include: { completedBy: true } },
                  completedBy: true,
                },
                orderBy: { id: 'asc' },
              },
              completedBy: true,
            },
            orderBy: { id: 'asc' },
          },
        },
      });
      const templatesToChange = await this.prisma.periodicMaintenance.findMany({
        where: {
          originId,
          type: 'Template',
          removedAt: null,
        },
        include: {
          tasks: {
            where: { parentTaskId: null },
            include: {
              subTasks: {
                include: {
                  subTasks: { include: { completedBy: true } },
                  completedBy: true,
                },
                orderBy: { id: 'asc' },
              },
              completedBy: true,
            },
            orderBy: { id: 'asc' },
          },
        },
      });
      for (const template of templatesToChange) {
        //if pm variable changes
        if (pmIncluded) {
          await this.prisma.periodicMaintenance.update({
            where: {
              id: template.id,
            },
            data: {
              name: originPM.name,
              measurement: originPM.measurement,
              value: originPM.value,
              currentMeterReading: originPM.currentMeterReading,
              recur: originPM.recur,
            },
          });
        }
        //if task changes
        if (taskIncluded) {
          await this.prisma.periodicMaintenanceTask.deleteMany({
            where: {
              periodicMaintenanceId: template.id,
            },
          });
          await this.updatePMTaskInBackground({
            pm: originPM,
            copyPM: template,
          });
        }
      }
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }
  //** Delete originperiodic maintenance. */
  async deleteOriginPeriodicMaintenance(user: User, id: number) {
    try {
      await this.prisma.periodicMaintenance.update({
        where: { id },
        data: {
          removedAt: new Date(),
          removedById: user.id,
        },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }
  //** Delete periodic maintenance. */
  async deletePeriodicMaintenance(user: User, id: number) {
    const periodicMaintenance = await this.prisma.periodicMaintenance.findFirst(
      {
        where: { id },
        select: {
          id: true,
          entityId: true,
          name: true,
        },
      }
    );
    await this.entityService.checkEntityAssignmentOrPermission(
      periodicMaintenance.entityId,
      user.id,
      undefined,
      ['Admin', 'Engineer', 'User'],
      ['MODIFY_PERIODIC_MAINTENANCE']
    );
    try {
      const users = await this.entityService.getEntityAssignmentIds(
        periodicMaintenance.entityId,
        user.id
      );
      for (let index = 0; index < users.length; index++) {
        await this.notificationService.createInBackground({
          userId: users[index],
          body: `${user.fullName} (${user.rcno}) deleted periodic maintenance template (${periodicMaintenance.id}) on entity ${periodicMaintenance.entityId}`,
          link: `/entity/${periodicMaintenance.entityId}`,
        });
      }
      await this.entityService.createEntityHistoryInBackground({
        type: 'Periodic Maintenance Template Delete',
        description: `(${id}) Periodic Maintenance (${periodicMaintenance.name}) deleted.`,
        entityId: periodicMaintenance.entityId,
        completedById: user.id,
      });
      await this.prisma.periodicMaintenance.update({
        where: { id },
        data: {
          removedAt: new Date(),
          removedById: user.id,
        },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async assignPeriodicMaintenanceTemplate(
    user: User,
    entityId: number,
    originId: number
  ) {
    // check if template is created or not
    const templateExist = await this.prisma.periodicMaintenance.findFirst({
      where: { entityId, originId, removedAt: null },
    });
    if (templateExist) {
      throw new BadRequestException('Template already exist.');
    }
    const entity = await this.prisma.entity.findFirst({
      where: { id: entityId },
    });
    const reading = await this.entityService.getLatestReading(entity);
    const pm = await this.prisma.periodicMaintenance.findFirst({
      where: { id: originId },
      include: {
        tasks: {
          where: { parentTaskId: null },
          include: {
            subTasks: {
              include: {
                subTasks: { include: { completedBy: true } },
                completedBy: true,
              },
              orderBy: { id: 'asc' },
            },
            completedBy: true,
          },
          orderBy: { id: 'asc' },
        },
      },
    });
    await this.entityService.checkEntityAssignmentOrPermission(
      entityId,
      user.id,
      entity,
      ['Admin'],
      ['MODIFY_TEMPLATES']
    );
    try {
      const newPM = await this.prisma.periodicMaintenance.create({
        data: {
          from: pm.from,
          to: pm.to,
          name: pm.name,
          entityId,
          originId: pm.id,
          measurement: pm.measurement,
          value: pm.value,
          currentMeterReading: reading,
          type: 'Template',
          recur: pm.recur,
          status: 'Upcoming',
          dueAt: reading + pm.value,
        },
      });

      await this.updatePMTaskInBackground({ pm: pm, copyPM: newPM });

      /*
      const reminder = await this.prisma.reminder.findMany({
        where: {
          periodicMaintenanceId: pm.id,
        },
      });
      await this.prisma.reminder.createMany({
        data: reminder.map((rm) => ({
          type: 'Template',
          measurement: rm.measurement,
          value: rm.value,
          previousValue:
            entity?.measurement === 'day' ? rm.value : entity.currentRunning,
          periodicMaintenanceId: newPM.id,
        })),
      });
      */
      //run generate again so copies will be made
      //this.generatePeriodicMaintenances();
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async bulkAssignPeriodicMaintenanceTemplate(
    user: User,
    entityIds: number[],
    originId: number
  ) {
    if (entityIds.length <= 0) {
      return;
    }
    // check if template is created or not
    const templatesExist = await this.prisma.periodicMaintenance.findMany({
      where: { entityId: { in: entityIds }, originId, removedAt: null },
      include: { entity: true },
    });
    for (const t of templatesExist) {
      throw new BadRequestException(
        `Template already exist in ${t?.entity?.machineNumber}.`
      );
    }
    const entities = await this.prisma.entity.findMany({
      where: { id: { in: entityIds } },
    });
    for (const e of entities) {
      await this.entityService.checkEntityAssignmentOrPermission(
        e.id,
        user.id,
        e,
        ['Admin'],
        ['MODIFY_TEMPLATES']
      );
    }

    const pm = await this.prisma.periodicMaintenance.findFirst({
      where: { id: originId },
      include: {
        tasks: {
          where: { parentTaskId: null },
          include: {
            subTasks: {
              include: {
                subTasks: { include: { completedBy: true } },
                completedBy: true,
              },
              orderBy: { id: 'asc' },
            },
            completedBy: true,
          },
          orderBy: { id: 'asc' },
        },
      },
    });

    try {
      for (const e of entities) {
        const reading = await this.entityService.getLatestReading(e);
        const newPM = await this.prisma.periodicMaintenance.create({
          data: {
            from: pm.from,
            to: pm.to,
            name: pm.name,
            entityId: e.id,
            originId: pm.id,
            measurement: pm.measurement,
            value: pm.value,
            currentMeterReading: reading,
            type: 'Template',
            recur: pm.recur,
            status: 'Upcoming',
            dueAt: reading + pm.value,
          },
        });
        await this.updatePMTaskInBackground({ pm: pm, copyPM: newPM });
      }
      /*
      const reminder = await this.prisma.reminder.findMany({
        where: {
          periodicMaintenanceId: pm.id,
        },
      });
      await this.prisma.reminder.createMany({
        data: reminder.map((rm) => ({
          type: 'Template',
          measurement: rm.measurement,
          value: rm.value,
          previousValue:
            entity?.measurement === 'day' ? rm.value : entity.currentRunning,
          periodicMaintenanceId: newPM.id,
        })),
      });
      */
      //run generate again so copies will be made
      //this.generatePeriodicMaintenances();
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  // Check if old periodic maintenance and throw error
  async checkIfOldPeriodicMaintenance(
    periodicMaintenanceId: number,
    to?: Date
  ) {
    try {
      if (!to) {
        to = (
          await this.prisma.periodicMaintenance.findFirst({
            where: { id: periodicMaintenanceId },
            select: { to: true },
          })
        ).to;
      }
      const now = moment();
      if (moment(to).isBefore(now, 'second')) {
        throw new BadRequestException(
          'Cannot update older periodic maintenances.'
        );
      }
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async updatePeriodicMaintenanceReading(
    user: User,
    id: number,
    reading: number
  ) {
    try {
      const periodicMaintenance =
        await this.prisma.periodicMaintenance.findFirst({
          where: { id },
          select: {
            entity: {
              select: {
                id: true,
                currentRunning: true,
              },
            },
            originId: true,
          },
        });
      await this.entityService.checkEntityAssignmentOrPermission(
        periodicMaintenance.entity.id,
        user.id,
        undefined,
        []
      );

      //update copy with new values. (Not necessary to update previous reading for copies)
      await this.prisma.periodicMaintenance.update({
        where: { id },
        data: { currentMeterReading: reading },
      });

      //update the template as well so that it will make copy when it fulfills the requirement
      await this.prisma.periodicMaintenance.update({
        where: {
          id: periodicMaintenance.originId,
        },
        data: { currentMeterReading: reading },
      });
      //update last service to currentReading
      await this.prisma.entity.update({
        where: { id: periodicMaintenance.entity.id },
        data: { lastService: reading, lastServiceUpdateAt: new Date() },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async addPeriodicMaintenanceComment(
    user: User,
    type: string,
    periodicMaintenanceId: number,
    taskId: number,
    description: string
  ) {
    try {
      const pm = await this.prisma.periodicMaintenance.findFirst({
        where: { id: periodicMaintenanceId },
      });
      if (!pm) {
        throw new BadRequestException('Invalid periodic maintenance.');
      }
      if (type === 'Remark') {
        await this.prisma.periodicMaintenanceComment.create({
          data: {
            periodicMaintenanceId,
            taskId,
            type: 'Remark',
            description,
            createdById: user.id,
          },
        });
      } else if (type === 'Observation') {
        await this.prisma.periodicMaintenanceComment.create({
          data: {
            periodicMaintenanceId,
            type: 'Observation',
            description,
            createdById: user.id,
          },
        });
      }
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async removePeriodicMaintenanceComment(user: User, id: number) {
    try {
      const comment = await this.prisma.periodicMaintenanceComment.findFirst({
        where: { id },
        select: { createdById: true },
      });
      if (comment.createdById !== user.id) {
        throw new ForbiddenError("Cannot delete other user's comments.");
      }
      await this.prisma.periodicMaintenanceComment.delete({ where: { id } });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async periodicMaintenanceSummary(
    entityId: number,
    from: Date,
    to: Date
  ): Promise<PeriodicMaintenanceSummary[]> {
    try {
      await this.entityService.findOne(entityId);

      const fromDate = moment(from).startOf('day');
      const toDate = moment(to).endOf('day');

      const where: any = {};

      where.type = 'Copy';
      where.removedAt = null;
      if (from && to) {
        where.createdAt = { gte: fromDate.toDate(), lte: toDate.toDate() };
      }

      if (entityId) {
        where.entityId = entityId;
      }

      const periodicMaintenances =
        await this.prisma.periodicMaintenance.findMany({
          where,
          include: {
            tasks: {
              where: { parentTaskId: null },
              include: {
                subTasks: {
                  include: {
                    subTasks: {
                      include: {
                        completedBy: true,
                        remarks: {
                          include: {
                            createdBy: true,
                          },
                        },
                      },
                    },
                    completedBy: true,
                    remarks: {
                      include: {
                        createdBy: true,
                      },
                    },
                  },
                  orderBy: { id: 'asc' },
                },
                completedBy: true,
                remarks: {
                  include: {
                    createdBy: true,
                  },
                },
              },
              orderBy: { id: 'asc' },
            },
            verifiedBy: true,
            comments: {
              include: {
                createdBy: true,
              },
            },
          },
        });
      const summaries: PeriodicMaintenanceSummary[] = [];
      for (const pm of periodicMaintenances) {
        const summary = new PeriodicMaintenanceSummary();
        Object.assign(summary, pm);
        if (pm.tasks.length === 0) {
          summary.taskCompletion = 'empty';
        } else if (
          pm.tasks.flat(2).every((task) => task.completedAt !== null)
        ) {
          summary.taskCompletion = 'all';
        } else if (pm.tasks.flat(2).some((task) => task.completedAt !== null)) {
          summary.taskCompletion = 'some';
        } else {
          summary.taskCompletion = 'none';
        }
        summary.hasObservations =
          pm.comments.filter((c) => c.type === 'Observation').length > 0
            ? true
            : false;
        summary.hasRemarks =
          pm.comments.filter((c) => c.type === 'Remark').length > 0
            ? true
            : false;
        summary.hasVerify = pm.verifiedAt !== null;
        summaries.push(summary);
      }
      return summaries;
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async allPeriodicMaintenanceSummary(
    args: PeriodicMaintenanceConnectionArgs
  ): Promise<PeriodicMaintenanceSummary[]> {
    try {
      const {
        search,
        type2Ids,
        measurement,
        locationIds,
        zoneIds,
        divisionIds,
        gteInterService,
        lteInterService,
        pmStatus,
        from,
        to,
      } = args;
      const fromDate = moment(from).startOf('day');
      const toDate = moment(to).endOf('day');

      // eslint-disable-next-line prefer-const
      let where: any = { AND: [] };
      const todayStart = moment(from).startOf('day');
      const todayEnd = moment(to).endOf('day');

      where.AND.push({
        removedAt: null,
        entityId: { not: null },
        type: { in: ['Copy', 'Template'] },
      });

      if (search) {
        const or: any = [
          { entity: { model: { contains: search, mode: 'insensitive' } } },
          {
            entity: {
              machineNumber: { contains: search, mode: 'insensitive' },
            },
          },
          { name: { contains: search, mode: 'insensitive' } },
        ];
        // If search contains all numbers, search the machine ids as well
        if (/^(0|[1-9]\d*)$/.test(search)) {
          or.push({ id: parseInt(search) });
        }
        where.AND.push({
          OR: or,
        });
      }

      if (type2Ids?.length > 0) {
        where.AND.push({
          entity: { typeId: { in: type2Ids } },
        });
      }

      if (measurement?.length > 0) {
        where.AND.push({
          entity: { measurement: { in: measurement } },
        });
      }

      if (locationIds?.length > 0) {
        where.AND.push({
          entity: { locationId: { in: locationIds } },
        });
      }

      if (zoneIds?.length > 0) {
        where.AND.push({ entity: { location: { zoneId: { in: zoneIds } } } });
      }

      if (divisionIds?.length > 0) {
        where.AND.push({
          entity: { divisionId: { in: divisionIds } },
        });
      }

      if (pmStatus?.length > 0) {
        where.AND.push({
          status: { in: pmStatus },
        });
      }

      if (gteInterService?.replace(/\D/g, '')) {
        where.AND.push({
          entity: {
            interService: { gte: parseInt(gteInterService.replace(/\D/g, '')) },
          },
        });
      }

      if (lteInterService?.replace(/\D/g, '')) {
        where.AND.push({
          entity: {
            interService: { lte: parseInt(lteInterService.replace(/\D/g, '')) },
          },
        });
      }

      if (
        gteInterService?.replace(/\D/g, '') &&
        lteInterService?.replace(/\D/g, '')
      ) {
        where.AND.push({
          entity: {
            interService: {
              gte: parseInt(gteInterService.replace(/\D/g, '')),
              lte: parseInt(lteInterService.replace(/\D/g, '')),
            },
          },
        });
      }
      if (from) {
        where.AND.push({
          createdAt: { gte: todayStart.toDate() },
        });
      }

      if (to) {
        where.AND.push({
          createdAt: { lte: todayEnd.toDate() },
        });
      }
      if (from && to) {
        where.AND.push({
          createdAt: { gte: todayStart.toDate(), lte: todayEnd.toDate() },
        });
      }

      const periodicMaintenances =
        await this.prisma.periodicMaintenance.findMany({
          where,
          include: {
            verifiedBy: true,
            comments: {
              include: {
                createdBy: true,
              },
            },
          },
        });
      const periodicMaintenanceIds = periodicMaintenances.map((p) => p.id);

      const pmTasks = await this.prisma.periodicMaintenanceTask.findMany({
        where: { periodicMaintenanceId: { in: periodicMaintenanceIds } },
        select: { periodicMaintenanceId: true, completedAt: true },
      });

      const summaries: PeriodicMaintenanceSummary[] = [];
      let i = 0;
      //console.time('pm');
      while (i < periodicMaintenances.length) {
        const summary = new PeriodicMaintenanceSummary();
        Object.assign(summary, periodicMaintenances[i]);
        //console.time('tasks filter');
        const tasks = pmTasks.filter(
          (t) => t.periodicMaintenanceId === periodicMaintenances[i].id
        );
        //console.log(tasks.length);
        //console.timeEnd('tasks filter');

        //console.time('tasks completion');
        if (tasks.length === 0) {
          summary.taskCompletion = 'empty';
        } else if (tasks.every((t) => t.completedAt !== null)) {
          summary.taskCompletion = 'all';
        } else if (tasks.some((t) => t.completedAt !== null)) {
          summary.taskCompletion = 'some';
        } else {
          summary.taskCompletion = 'none';
        }
        //console.timeEnd('tasks completion');

        //console.time('comment');
        summary.hasObservations = false;
        summary.hasRemarks = false;
        periodicMaintenances[i].comments.filter((c) => {
          if (c?.type === 'Observation') {
            summary.hasObservations = true;
          } else if (c?.type === 'Remark') {
            summary.hasRemarks = true;
          }
        });
        summary.hasVerify = periodicMaintenances[i].verifiedAt !== null;
        //console.timeEnd('comment');
        summaries.push(summary);
        i++;
        //console.timeEnd();
      }
      //console.timeEnd('pm');
      return summaries;
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //update or create reminder
  //add removedAt check later
  /*
  async upsertPMNotificationReminder(
    user?: User,
    periodicMaintenanceId?: number,
    type?: string,
    hour?: number,
    kilometer?: number,
    day?: number,
    week?: number,
    month?: number
  ) {
    try {
      //if value exist do the following, else it null
      if (hour) {
        const rm = await this.prisma.reminder.findFirst({
          where: { periodicMaintenanceId, measurement: 'Hour' },
        });
        //update if it does exist. else create it
        if (rm) {
          await this.prisma.reminder.update({
            where: { id: rm.id },
            data: { value: hour },
          });
          //update template pm's notification reminder
          const pm = await this.prisma.periodicMaintenance.findMany({
            where: { originId: periodicMaintenanceId },
            include: { entity: true, notificationReminder: true },
          });
          for (const p of pm) {
            const reading = await this.entityService.getLatestReading(p.entity);
            for (const r of p.notificationReminder) {
              if (r.measurement === 'Hour') {
                await this.prisma.reminder.update({
                  where: { id: r.id },
                  data: { previousValue: reading, value: hour },
                });
              }
            }
          }
        } else {
          const r = await this.prisma.reminder.create({
            data: {
              periodicMaintenanceId,
              type,
              value: hour,
              measurement: 'Hour',
            },
          });
          //create template pm's notification reminder
          const pm = await this.prisma.periodicMaintenance.findMany({
            where: { originId: periodicMaintenanceId },
            include: { entity: true },
          });
          for (const p of pm) {
            const reading = await this.entityService.getLatestReading(p.entity);
            await this.prisma.reminder.create({
              data: {
                periodicMaintenanceId: p.id,
                type: 'Template',
                value: hour,
                measurement: 'Hour',
                previousValue: reading,
                originId: r.id,
              },
            });
          }
        }
      } else {
        const rm = await this.prisma.reminder.findFirst({
          where: { periodicMaintenanceId, measurement: 'Hour' },
        });
        //update if it does exist. else create it
        if (rm) {
          await this.prisma.reminder.update({
            where: { id: rm.id },
            data: { value: null },
          });
          //update template pm's notification reminder
          const pm = await this.prisma.periodicMaintenance.findMany({
            where: { originId: periodicMaintenanceId },
            include: { notificationReminder: true },
          });
          for (const p of pm) {
            for (const r of p.notificationReminder) {
              if (r.measurement === 'Hour') {
                await this.prisma.reminder.update({
                  where: { id: r.id },
                  data: { previousValue: null, value: null },
                });
              }
            }
          }
        }
      }

      if (kilometer) {
        const rm = await this.prisma.reminder.findFirst({
          where: { periodicMaintenanceId, measurement: 'Kilometer' },
        });
        if (rm) {
          await this.prisma.reminder.update({
            where: { id: rm.id },
            data: { value: kilometer },
          });
          //update template pm's notification reminder
          const pm = await this.prisma.periodicMaintenance.findMany({
            where: { originId: periodicMaintenanceId },
            include: { entity: true, notificationReminder: true },
          });
          for (const p of pm) {
            const reading = await this.entityService.getLatestReading(p.entity);
            for (const r of p.notificationReminder) {
              if (r.measurement === 'Kilometer') {
                await this.prisma.reminder.update({
                  where: { id: r.id },
                  data: { previousValue: reading, value: kilometer },
                });
              }
            }
          }
        } else {
          const r = await this.prisma.reminder.create({
            data: {
              periodicMaintenanceId,
              type,
              value: kilometer,
              measurement: 'Kilometer',
            },
          });
          //create template pm's notification reminder
          const pm = await this.prisma.periodicMaintenance.findMany({
            where: { originId: periodicMaintenanceId },
            include: { entity: true },
          });
          for (const p of pm) {
            const reading = await this.entityService.getLatestReading(p.entity);
            await this.prisma.reminder.create({
              data: {
                periodicMaintenanceId: p.id,
                type: 'Template',
                value: kilometer,
                measurement: 'Kilometer',
                previousValue: reading,
                originId: r.id,
              },
            });
          }
        }
      } else {
        const rm = await this.prisma.reminder.findFirst({
          where: { periodicMaintenanceId, measurement: 'Kilometer' },
        });
        if (rm) {
          await this.prisma.reminder.update({
            where: { id: rm.id },
            data: { value: null },
          });
          //update template pm's notification reminder
          const pm = await this.prisma.periodicMaintenance.findMany({
            where: { originId: periodicMaintenanceId },
            include: { notificationReminder: true },
          });
          for (const p of pm) {
            for (const r of p.notificationReminder) {
              if (r.measurement === 'Kilometer') {
                await this.prisma.reminder.update({
                  where: { id: r.id },
                  data: { previousValue: null, value: null },
                });
              }
            }
          }
        }
      }

      if (day) {
        const rm = await this.prisma.reminder.findFirst({
          where: { periodicMaintenanceId, measurement: 'Day' },
        });
        if (rm) {
          await this.prisma.reminder.update({
            where: { id: rm.id },
            data: { value: day },
          });
          //update template pm's notification reminder
          const pm = await this.prisma.periodicMaintenance.findMany({
            where: { originId: periodicMaintenanceId },
            include: { notificationReminder: true },
          });
          for (const p of pm) {
            const todayStart = moment().startOf('day');
            const createdAtStart = moment(p.createdAt).startOf('day');
            const diff = Math.abs(todayStart.diff(createdAtStart, 'days'));
            for (const r of p.notificationReminder) {
              if (r.measurement === 'Day') {
                await this.prisma.reminder.update({
                  where: { id: r.id },
                  data: { previousValue: diff, value: day },
                });
              }
            }
          }
        } else {
          const r = await this.prisma.reminder.create({
            data: {
              periodicMaintenanceId,
              type,
              value: day,
              measurement: 'Day',
            },
          });
          //create template pm's notification reminder
          const pm = await this.prisma.periodicMaintenance.findMany({
            where: { originId: periodicMaintenanceId },
            include: { entity: true },
          });
          for (const p of pm) {
            const todayStart = moment().startOf('day');
            const createdAtStart = moment(p.createdAt).startOf('day');
            const diff = Math.abs(todayStart.diff(createdAtStart, 'days'));
            await this.prisma.reminder.create({
              data: {
                periodicMaintenanceId: p.id,
                type: 'Template',
                value: day,
                measurement: 'Day',
                previousValue: diff,
                originId: r.id,
              },
            });
          }
        }
      } else {
        const rm = await this.prisma.reminder.findFirst({
          where: { periodicMaintenanceId, measurement: 'Day' },
        });
        if (rm) {
          await this.prisma.reminder.update({
            where: { id: rm.id },
            data: { value: null },
          });
          //update template pm's notification reminder
          const pm = await this.prisma.periodicMaintenance.findMany({
            where: { originId: periodicMaintenanceId },
            include: { notificationReminder: true },
          });
          for (const p of pm) {
            for (const r of p.notificationReminder) {
              if (r.measurement === 'Day') {
                await this.prisma.reminder.update({
                  where: { id: r.id },
                  data: { previousValue: null, value: null },
                });
              }
            }
          }
        }
      }

      if (week) {
        const rm = await this.prisma.reminder.findFirst({
          where: { periodicMaintenanceId, measurement: 'Week' },
        });
        if (rm) {
          await this.prisma.reminder.update({
            where: { id: rm.id },
            data: { value: week },
          });
          //update template pm's notification reminder
          const pm = await this.prisma.periodicMaintenance.findMany({
            where: { originId: periodicMaintenanceId },
            include: { notificationReminder: true },
          });
          for (const p of pm) {
            const todayStart = moment().startOf('day');
            const createdAtStart = moment(p.createdAt).startOf('day');
            const diff = Math.abs(todayStart.diff(createdAtStart, 'days'));
            for (const r of p.notificationReminder) {
              if (r.measurement === 'Week') {
                await this.prisma.reminder.update({
                  where: { id: r.id },
                  data: { previousValue: diff, value: week },
                });
              }
            }
          }
        } else {
          const r = await this.prisma.reminder.create({
            data: {
              periodicMaintenanceId,
              type,
              value: week,
              measurement: 'Week',
            },
          });
          //create template pm's notification reminder
          const pm = await this.prisma.periodicMaintenance.findMany({
            where: { originId: periodicMaintenanceId },
            include: { entity: true },
          });
          for (const p of pm) {
            const todayStart = moment().startOf('day');
            const createdAtStart = moment(p.createdAt).startOf('day');
            const diff = Math.abs(todayStart.diff(createdAtStart, 'days'));
            await this.prisma.reminder.create({
              data: {
                periodicMaintenanceId: p.id,
                type: 'Template',
                value: week,
                measurement: 'Week',
                previousValue: diff,
                originId: r.id,
              },
            });
          }
        }
      } else {
        const rm = await this.prisma.reminder.findFirst({
          where: { periodicMaintenanceId, measurement: 'Week' },
        });
        if (rm) {
          await this.prisma.reminder.update({
            where: { id: rm.id },
            data: { value: null },
          });
          //update template pm's notification reminder
          const pm = await this.prisma.periodicMaintenance.findMany({
            where: { originId: periodicMaintenanceId },
            include: { notificationReminder: true },
          });
          for (const p of pm) {
            for (const r of p.notificationReminder) {
              if (r.measurement === 'Week') {
                await this.prisma.reminder.update({
                  where: { id: r.id },
                  data: { previousValue: null, value: null },
                });
              }
            }
          }
        }
      }
      if (month) {
        const rm = await this.prisma.reminder.findFirst({
          where: { periodicMaintenanceId, measurement: 'Month' },
        });
        if (rm) {
          await this.prisma.reminder.update({
            where: { id: rm.id },
            data: { value: month },
          });
          //update template pm's notification reminder
          const pm = await this.prisma.periodicMaintenance.findMany({
            where: { originId: periodicMaintenanceId },
            include: { notificationReminder: true },
          });
          for (const p of pm) {
            const todayStart = moment().startOf('day');
            const createdAtStart = moment(p.createdAt).startOf('day');
            const diff = Math.abs(todayStart.diff(createdAtStart, 'days'));
            for (const r of p.notificationReminder) {
              if (r.measurement === 'Month') {
                await this.prisma.reminder.update({
                  where: { id: r.id },
                  data: { previousValue: diff, value: month },
                });
              }
            }
          }
        } else {
          const r = await this.prisma.reminder.create({
            data: {
              periodicMaintenanceId,
              type,
              value: month,
              measurement: 'Month',
            },
          });
          //create template pm's notification reminder
          const pm = await this.prisma.periodicMaintenance.findMany({
            where: { originId: periodicMaintenanceId },
            include: { entity: true },
          });
          for (const p of pm) {
            const todayStart = moment().startOf('day');
            const createdAtStart = moment(p.createdAt).startOf('day');
            const diff = Math.abs(todayStart.diff(createdAtStart, 'days'));
            await this.prisma.reminder.create({
              data: {
                periodicMaintenanceId: p.id,
                type: 'Template',
                value: month,
                measurement: 'Month',
                previousValue: diff,
                originId: r.id,
              },
            });
          }
        }
      } else {
        const rm = await this.prisma.reminder.findFirst({
          where: { periodicMaintenanceId, measurement: 'Month' },
        });
        if (rm) {
          await this.prisma.reminder.update({
            where: { id: rm.id },
            data: { value: null },
          });
          //update template pm's notification reminder
          const pm = await this.prisma.periodicMaintenance.findMany({
            where: { originId: periodicMaintenanceId },
            include: { notificationReminder: true },
          });
          for (const p of pm) {
            for (const r of p.notificationReminder) {
              if (r.measurement === 'Month') {
                await this.prisma.reminder.update({
                  where: { id: r.id },
                  data: { previousValue: null, value: null },
                });
              }
            }
          }
        }
      }
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }
  */

  /*
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async generatePeriodicMaintenancesCron() {
    this.logger.verbose('Periodic Maintenance generation cron job started');
    // Temporarily running as direct function call
    // Should be run in the background by a queue instead
    await this.generatePeriodicMaintenances();
  }
*/
  /*
  async generatePeriodicMaintenances() {
    try {
      //using original periodic maintenance as template to make its copies

      //get all copies and update to overdue if wasn't completed yesterday
      const yesterdayStart = moment().subtract(1, 'days').startOf('day');
      const yesterdayEnd = moment().subtract(1, 'days').endOf('day');
      const periodicMaintenanceCopies =
        await this.prisma.periodicMaintenance.findMany({
          where: {
            type: 'Copy',
            removedAt: null,
            status: 'Ongoing',
            from: yesterdayStart.toDate(),
            to: yesterdayEnd.toDate(),
          },
          select: { id: true },
        });
      for (const p of periodicMaintenanceCopies) {
        await this.prisma.periodicMaintenance.update({
          where: { id: p.id },
          data: { status: 'Overdue' },
        });
      }

      // Get ids of all pm template
      const periodicMaintenance =
        await this.prisma.periodicMaintenance.findMany({
          where: { type: 'Template', recur: true, removedAt: null },
          select: { id: true },
        });
      const originIds = periodicMaintenance.map((m) => m.id);

      const todayStart = moment().startOf('day');
      const todayEnd = moment().endOf('day');

      // Get all pm copies that have been generated today
      const todayPeriodicMaintenances =
        await this.prisma.periodicMaintenance.findMany({
          where: {
            from: todayStart.toDate(),
            to: todayEnd.toDate(),
            type: 'Copy',
            removedAt: null,
          },
          select: { originId: true },
        });

      const todayPeriodicMaintenanceOriginIds = todayPeriodicMaintenances.map(
        (c) => c.originId
      );

      //if there is generated, remove origin pm ids from pm array (copy's origin id will be template pm)
      const notGeneratedPeriodicMaintenanceOriginIds = originIds.filter(
        (id) => !todayPeriodicMaintenanceOriginIds.includes(id)
      );
      //get all template periodic maintenance
      const templatePM = await this.prisma.periodicMaintenance.findMany({
        where: {
          id: {
            in: notGeneratedPeriodicMaintenanceOriginIds,
          },
        },
        include: {
          verifiedBy: true,
          entity: true,
          notificationReminder: true,
          tasks: {
            where: { parentTaskId: null },
            include: {
              subTasks: {
                include: {
                  subTasks: { include: { completedBy: true } },
                  completedBy: true,
                },
                orderBy: { id: 'asc' },
              },
              completedBy: true,
            },
            orderBy: { id: 'asc' },
          },
        },
      });
      //check if fulfills the requirement and then create it
      for (const pm of templatePM) {
        if (pm.measurement === 'Hour') {
          const currentReading = pm.currentMeterReading;
          const computedReading = await this.entityService.getLatestReading(
            pm.entity
          );
          //console.log('computedReading = ' + computedReading);
          //console.log('currentReading = ' + currentReading);

          //const readingDiff = Math.abs(currentReading - previousReading);
          const computedReadingDiff = computedReading - currentReading;
          //console.log('computedReadingDiff = ' + computedReadingDiff);
          //console.log('value = ' + pm.value);
          //if difference is more than or equal it means it's ready to be made
          //const flag = readingDiff >= pm.value || computedReadingDiff >= pm.value;
          const flag = computedReadingDiff >= pm.value;
          if (flag) {
            this.createPM(pm);
          }
        } else if (pm.measurement === 'Kilometer') {
          const currentMeterReading = pm.currentMeterReading;
          const computedReading = await this.entityService.getLatestReading(
            pm.entity
          );

          const computedReadingDiff = computedReading - currentMeterReading;
          //if difference is more than or equal it means it's ready to be made
          const flag = computedReadingDiff >= pm.value;
          if (flag) {
            this.createPM(pm);
          }
        } else if (pm.measurement === 'Day') {
          const todayStart = moment().startOf('day');
          const createdAtStart = moment(pm.createdAt).startOf('day');
          const diff = Math.abs(todayStart.diff(createdAtStart, 'days'));
          const flag = diff % pm.value;
          if (flag == 0) {
            this.createPM(pm, true);
          }
        } else if (pm.measurement === 'Week') {
          const todayStart = moment().startOf('day');
          const createdAtStart = moment(pm.createdAt).startOf('day');
          const diff = Math.abs(todayStart.diff(createdAtStart, 'days'));
          //multiplying by 7 since a week has 7 days
          const flag = diff % (pm.value * 7);
          if (flag == 0) {
            this.createPM(pm, true);
          }
        } else if (pm.measurement === 'Month') {
          const todayStart = moment().startOf('day');
          const createdAtStart = moment(pm.createdAt).startOf('day');
          const diff = Math.abs(todayStart.diff(createdAtStart, 'days'));
          //multiplying by 30 since a month has 30 days
          const flag = diff % (pm.value * 30);
          if (flag == 0) {
            this.createPM(pm, true);
          }
        }
      }
      this.logger.verbose('Periodic Maintenance generation complete');
    } catch (e) {
      console.log(e);
    }
  }
  
  
  */

  /*
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async notificationReminderCrons() {
    this.logger.verbose('Notification reminder cron job started');
    await this.notificationReminder();
  }

  async notificationReminder() {
    // Get ids of all pm template
    const templatePeriodicMaintenance =
      await this.prisma.periodicMaintenance.findMany({
        where: { type: 'Template', removedAt: null },
        include: { entity: true, notificationReminder: true },
      });

    //check if fulfills the requirement and then trigger it
    for (const pm of templatePeriodicMaintenance) {
      for (const rm of pm.notificationReminder) {
        if (rm.measurement === 'Hour') {
          const previousValue = rm.previousValue;
          const computedReading = await this.entityService.getLatestReading(
            pm.entity
          );
          const computedReadingDiff = Math.abs(computedReading - previousValue);
          //if difference is more than or equal it means it's ready to be triggered
          const flag = computedReadingDiff >= rm.value;
          if (flag) {
            const users = await this.entityService.getEntityAssignmentIds(
              pm.entityId
            );
            for (let index = 0; index < users.length; index++) {
              await this.notificationService.createInBackground({
                userId: users[index],
                body: `Periodic maintenance (${pm.id}) notification reminder (${rm.id}) on entity(${pm.entityId})`,
                link: `/entity/${pm.entityId}`,
              });
            }
            //after triggering, need to update the values
            await this.prisma.reminder.update({
              where: { id: rm.id },
              data: { previousValue: computedReading + rm.value },
            });
          }
        } else if (rm.measurement === 'Kilometer') {
          const previousValue = rm.previousValue;
          const computedReading = await this.entityService.getLatestReading(
            pm.entity
          );
          const computedReadingDiff = Math.abs(computedReading - previousValue);
          const flag = computedReadingDiff >= rm.value;
          if (flag) {
            const users = await this.entityService.getEntityAssignmentIds(
              pm.entityId
            );
            for (let index = 0; index < users.length; index++) {
              await this.notificationService.createInBackground({
                userId: users[index],
                body: `Periodic maintenance (${pm.id}) notification reminder (${rm.id}) on entity(${pm.entityId})`,
                link: `/entity/${pm.entityId}`,
              });
            }
            await this.prisma.reminder.update({
              where: { id: rm.id },
              data: { previousValue: computedReading + rm.value },
            });
          }
        } else if (rm.measurement === 'Day') {
          const todayStart = moment().startOf('day');
          const createdAtStart = moment(rm.createdAt).startOf('day');
          const diff = Math.abs(todayStart.diff(createdAtStart, 'days'));
          const flag = diff % pm.value;

          if (flag == 0) {
            const users = await this.entityService.getEntityAssignmentIds(
              pm.entityId
            );
            for (let index = 0; index < users.length; index++) {
              await this.notificationService.createInBackground({
                userId: users[index],
                body: `Periodic maintenance (${pm.id}) notification reminder (${rm.id}) on entity(${pm.entityId})`,
                link: `/entity/${pm.entityId}`,
              });
            }
            //not sure if this will work
            await this.prisma.reminder.update({
              where: { id: rm.id },
              data: { previousValue: diff + rm.value },
            });
          }
        } else if (rm.measurement === 'Week') {
          const todayStart = moment().startOf('day');
          const createdAtStart = moment(pm.createdAt).startOf('day');
          const diff = Math.abs(todayStart.diff(createdAtStart, 'days'));
          //multiplying by 7 since a week has 7 days
          const flag = diff % (pm.value * 7);

          if (flag == 0) {
            const users = await this.entityService.getEntityAssignmentIds(
              pm.entityId
            );
            for (let index = 0; index < users.length; index++) {
              await this.notificationService.createInBackground({
                userId: users[index],
                body: `Periodic maintenance (${pm.id}) notification reminder (${rm.id}) on entity(${pm.entityId})`,
                link: `/entity/${pm.entityId}`,
              });
            }
            //not sure if this will work
            await this.prisma.reminder.update({
              where: { id: rm.id },
              data: { previousValue: diff + rm.value },
            });
          }
        } else if (rm.measurement === 'Month') {
          const todayStart = moment().startOf('day');
          const createdAtStart = moment(pm.createdAt).startOf('day');
          const diff = Math.abs(todayStart.diff(createdAtStart, 'days'));
          //multiplying by 30 since a month has 30 days
          const flag = diff % (pm.value * 30);
          if (flag == 0) {
            const users = await this.entityService.getEntityAssignmentIds(
              pm.entityId
            );
            for (let index = 0; index < users.length; index++) {
              await this.notificationService.createInBackground({
                userId: users[index],
                body: `Periodic maintenance (${pm.id}) notification reminder (${rm.id}) on entity(${pm.entityId})`,
                link: `/entity/${pm.entityId}`,
              });
            }
            //not sure if this will work
            await this.prisma.reminder.update({
              where: { id: rm.id },
              data: { previousValue: diff + rm.value },
            });
          }
        }
      }
    }
    this.logger.verbose('Notification Reminder Complete');
  }
  */
  /*
  async createPM(pm: PeriodicMaintenanceWithTasks, isDay?: boolean) {
    const todayStart = moment().startOf('day');
    const todayEnd = moment().endOf('day');
    try {
      const entity = await this.prisma.entity.findFirst({
        where: { id: pm?.entityId },
      });
      const computedReading = await this.entityService.getLatestReading(entity);
      //when pm copy is created it will use same reading.
      //so it won't make a copy when template created because it doesn't fulfill the requirements eg. hour, km
      if (isDay) {
        const copyPM = await this.prisma.periodicMaintenance.create({
          data: {
            from: todayStart.toDate(),
            to: todayEnd.toDate(),
            name: pm.name,
            entityId: pm.entityId,
            originId: pm.id,
            measurement: pm.measurement,
            value: pm?.value,
            currentMeterReading: computedReading,
            type: 'Copy',
            recur: false,
            status: 'Completed',
            verifiedAt: new Date(),
            dueAt: pm?.value + (pm?.dueAt ?? 0),
          },
        });
        //update the dueAt value in template pm
        await this.prisma.periodicMaintenance.update({
          where: { id: pm.id },
          data: { dueAt: computedReading + pm.value },
        });
        await this.updatePMTaskInBackground({ pm, copyPM, isDay: true });
      } else {
        const copyPM = await this.prisma.periodicMaintenance.create({
          data: {
            from: todayStart.toDate(),
            to: todayEnd.toDate(),
            name: pm.name,
            entityId: pm.entityId,
            originId: pm.id,
            measurement: pm.measurement,
            value: pm?.value,
            currentMeterReading: null,
            type: 'Copy',
            recur: false,
            status: 'Ongoing',
            dueAt: pm?.value + (pm?.dueAt ?? 0),
          },
        });
        //update the dueAt value in template pm
        await this.prisma.periodicMaintenance.update({
          where: { id: pm.id },
          data: { dueAt: computedReading + pm.value },
        });
        await this.updatePMTaskInBackground({ pm, copyPM });
      }
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }
*/
  async activatePM(user: User, id: number) {
    try {
      const todayStart = moment().startOf('day');
      const todayEnd = moment().endOf('day');
      const pm = await this.prisma.periodicMaintenance.findFirst({
        where: { id },
        include: {
          verifiedBy: true,
          entity: true,
          notificationReminder: true,
          tasks: {
            where: { parentTaskId: null },
            include: {
              subTasks: {
                include: {
                  subTasks: { include: { completedBy: true } },
                  completedBy: true,
                },
                orderBy: { id: 'asc' },
              },
              completedBy: true,
            },
            orderBy: { id: 'asc' },
          },
        },
      });
      const copyPM = await this.prisma.periodicMaintenance.create({
        data: {
          from: todayStart.toDate(),
          to: todayEnd.toDate(),
          name: pm.name,
          entityId: pm.entityId,
          originId: pm.id,
          measurement: pm.measurement,
          value: pm.value,
          currentMeterReading: null,
          type: 'Copy',
          recur: false,
          status: 'Ongoing',
          dueAt: pm?.dueAt,
        },
      });
      let level1;
      let level2;
      for (let index = 0; index < pm.tasks.length; index++) {
        level1 = await this.prisma.periodicMaintenanceTask.create({
          data: {
            periodicMaintenanceId: copyPM.id,
            name: pm.tasks[index].name,
          },
        });
        for (
          let index2 = 0;
          index2 < pm.tasks[index].subTasks.length;
          index2++
        ) {
          level2 = await this.prisma.periodicMaintenanceTask.create({
            data: {
              periodicMaintenanceId: copyPM.id,
              parentTaskId: level1.id,
              name: pm.tasks[index].subTasks[index2].name,
            },
          });
          for (
            let index3 = 0;
            index3 < pm.tasks[index].subTasks[index2].subTasks.length;
            index3++
          ) {
            await this.prisma.periodicMaintenanceTask.create({
              data: {
                periodicMaintenanceId: copyPM.id,
                parentTaskId: level2.id,
                name: pm.tasks[index].subTasks[index2].subTasks[index3].name,
              },
            });
          }
        }
      }
      await this.entityService.createEntityHistoryInBackground({
        type: 'Periodic maintenance verify',
        description: `Periodic maintenance (${id}) has been activated.`,
        entityId: pm?.entityId,
        completedById: user?.id,
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async checkCopyPMExist(id: number) {
    try {
      let exist = false;
      const fromDate = moment().startOf('day');
      const toDate = moment().endOf('day');
      const pm = await this.prisma.periodicMaintenance.findFirst({
        where: { originId: id, from: fromDate.toDate(), to: toDate.toDate() },
      });
      if (pm) {
        exist = true;
      }
      return exist;
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async createInnerTasks({ pm, copyPM, isDay }: UpdatePMTaskInterface) {
    try {
      let level1;
      let level2;
      if (isDay) {
        for (let index = 0; index < pm.tasks.length; index++) {
          level1 = await this.prisma.periodicMaintenanceTask.create({
            data: {
              periodicMaintenanceId: copyPM.id,
              name: pm.tasks[index].name,
              completedAt: new Date(),
            },
          });
          for (
            let index2 = 0;
            index2 < pm.tasks[index].subTasks.length;
            index2++
          ) {
            level2 = await this.prisma.periodicMaintenanceTask.create({
              data: {
                periodicMaintenanceId: copyPM.id,
                parentTaskId: level1.id,
                name: pm.tasks[index].subTasks[index2].name,
                completedAt: new Date(),
              },
            });
            for (
              let index3 = 0;
              index3 < pm.tasks[index].subTasks[index2].subTasks.length;
              index3++
            ) {
              await this.prisma.periodicMaintenanceTask.create({
                data: {
                  periodicMaintenanceId: copyPM.id,
                  parentTaskId: level2.id,
                  name: pm.tasks[index].subTasks[index2].subTasks[index3].name,
                  completedAt: new Date(),
                },
              });
            }
          }
        }
      } else {
        for (let index = 0; index < pm.tasks.length; index++) {
          level1 = await this.prisma.periodicMaintenanceTask.create({
            data: {
              periodicMaintenanceId: copyPM.id,
              name: pm.tasks[index].name,
            },
          });
          for (
            let index2 = 0;
            index2 < pm.tasks[index].subTasks.length;
            index2++
          ) {
            level2 = await this.prisma.periodicMaintenanceTask.create({
              data: {
                periodicMaintenanceId: copyPM.id,
                parentTaskId: level1.id,
                name: pm.tasks[index].subTasks[index2].name,
              },
            });
            for (
              let index3 = 0;
              index3 < pm.tasks[index].subTasks[index2].subTasks.length;
              index3++
            ) {
              await this.prisma.periodicMaintenanceTask.create({
                data: {
                  periodicMaintenanceId: copyPM.id,
                  parentTaskId: level2.id,
                  name: pm.tasks[index].subTasks[index2].subTasks[index3].name,
                },
              });
            }
          }
        }
      }
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Update pm task in all entity in background */
  async updatePMTaskInBackground(updatePMTask: UpdatePMTaskInterface) {
    try {
      await this.pmQueue.add('updatePMTask', {
        updatePMTask,
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Get all pm. Results are paginated. User cursor argument to go forward/backward. */
  async getAllPMWithPagination(
    user: User,
    args: PeriodicMaintenanceConnectionArgs
  ): Promise<PaginatedEntity> {
    try {
      const { limit, offset } = getPagingParameters(args);
      const limitPlusOne = limit + 1;
      const {
        search,
        type2Ids,
        measurement,
        locationIds,
        zoneIds,
        divisionIds,
        gteInterService,
        lteInterService,
        pmStatus,
        from,
        to,
      } = args;

      // eslint-disable-next-line prefer-const
      let where: any = { AND: [] };
      const todayStart = moment(from).startOf('day');
      const todayEnd = moment(to).endOf('day');

      where.AND.push({
        removedAt: null,
        entityId: { not: null },
      });

      if (search) {
        const or: any = [
          { entity: { model: { contains: search, mode: 'insensitive' } } },
          {
            entity: {
              machineNumber: { contains: search, mode: 'insensitive' },
            },
          },
          { name: { contains: search, mode: 'insensitive' } },
        ];
        // If search contains all numbers, search the machine ids as well
        if (/^(0|[1-9]\d*)$/.test(search)) {
          or.push({ id: parseInt(search) });
        }
        where.AND.push({
          OR: or,
        });
      }

      if (type2Ids?.length > 0) {
        where.AND.push({
          entity: { typeId: { in: type2Ids } },
        });
      }

      if (measurement?.length > 0) {
        where.AND.push({
          entity: { measurement: { in: measurement } },
        });
      }

      if (locationIds?.length > 0) {
        where.AND.push({
          entity: { locationId: { in: locationIds } },
        });
      }

      if (zoneIds?.length > 0) {
        where.AND.push({ entity: { location: { zoneId: { in: zoneIds } } } });
      }

      if (divisionIds?.length > 0) {
        where.AND.push({
          entity: { divisionId: { in: divisionIds } },
        });
      }

      if (pmStatus?.length > 0) {
        where.AND.push({
          status: { in: pmStatus },
        });
      }

      if (gteInterService?.replace(/\D/g, '')) {
        where.AND.push({
          entity: {
            interService: { gte: parseInt(gteInterService.replace(/\D/g, '')) },
          },
        });
      }

      if (lteInterService?.replace(/\D/g, '')) {
        where.AND.push({
          entity: {
            interService: { lte: parseInt(lteInterService.replace(/\D/g, '')) },
          },
        });
      }

      if (
        gteInterService?.replace(/\D/g, '') &&
        lteInterService?.replace(/\D/g, '')
      ) {
        where.AND.push({
          entity: {
            interService: {
              gte: parseInt(gteInterService.replace(/\D/g, '')),
              lte: parseInt(lteInterService.replace(/\D/g, '')),
            },
          },
        });
      }

      if (from) {
        where.AND.push({
          createdAt: { gte: todayStart.toDate() },
        });
      }

      if (to) {
        where.AND.push({
          createdAt: { lte: todayEnd.toDate() },
        });
      }
      if (from && to) {
        where.AND.push({
          createdAt: { gte: todayStart.toDate(), lte: todayEnd.toDate() },
        });
      }
      const newPeriodicMaintenances = [];
      const pm = await this.prisma.periodicMaintenance.findMany({
        where,
        include: {
          entity: {
            include: {
              type: {
                include: {
                  interServiceColor: {
                    where: { removedAt: null },
                    include: { brand: true, type: true },
                  },
                },
              },
              brand: true,
            },
          },
        },
        orderBy: [{ id: 'desc' }],
      });
      //get all pm that doesn't have green color in interservice
      for (const p of pm) {
        const interService =
          (p?.entity?.currentRunning ? p?.entity?.currentRunning : 0) -
          (p?.entity?.lastService ? p?.entity?.lastService : 0);
        if (p.entity?.type?.interServiceColor.length > 0) {
          for (const intColor of p.entity?.type?.interServiceColor) {
            if (
              intColor?.brand?.name === p?.entity?.brand?.name &&
              intColor?.type?.name === p?.entity?.type?.name &&
              intColor?.measurement === p?.entity?.measurement
            ) {
              if (
                interService >= intColor?.lessThan &&
                interService <= intColor?.greaterThan
              ) {
                newPeriodicMaintenances.push(p);
              } else if (interService >= intColor?.greaterThan) {
                newPeriodicMaintenances.push(p);
              }
            }
          }
        }
      }
      const newPeriodicMaintenanceIds = newPeriodicMaintenances.map(
        (p) => p.id
      );
      const entities = await this.prisma.entity.findMany({
        skip: offset,
        take: limitPlusOne,
        where: {
          periodicMaintenances: {
            some: {
              id: { in: newPeriodicMaintenanceIds },
            },
          },
        },
        include: {
          periodicMaintenances: {
            include: { verifiedBy: true },
            where,
            orderBy: [{ id: 'desc' }],
          },
          type: {
            include: {
              interServiceColor: {
                where: { removedAt: null },
                include: { brand: true, type: true },
              },
            },
          },
          location: { include: { zone: true } },
          division: true,
          sparePRs: {
            orderBy: { id: 'desc' },
            where: { completedAt: null },
            include: { sparePRDetails: true },
          },
          breakdowns: {
            orderBy: { id: 'desc' },
            where: { completedAt: null },
            include: {
              createdBy: true,
              details: { include: { repairs: true } },
              repairs: { include: { breakdownDetail: true } },
            },
          },
          assignees: {
            include: {
              user: true,
            },
            where: {
              removedAt: null,
            },
          },
          brand: true,
        },

        orderBy: [{ id: 'desc' }],
      });
      //apply calculated reading
      for (const e of entities) {
        const reading = await this.entityService.getLatestReading(e);
        if (reading !== null) {
          e.currentRunning = reading;
        }
      }
      const count = await this.prisma.entity.count({
        where: {
          periodicMaintenances: {
            some: {
              id: { in: newPeriodicMaintenanceIds },
            },
          },
        },
      });
      const { edges, pageInfo } = connectionFromArraySlice(
        entities.slice(0, limit),
        args,
        {
          arrayLength: count,
          sliceStart: offset,
        }
      );
      return {
        edges,
        pageInfo: {
          ...pageInfo,
          count,
          hasNextPage: offset + limit < count,
          hasPreviousPage: offset >= limit,
        },
      };
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Get all pm status count */
  async getAllPMStatusCount(
    user: User,
    args: PeriodicMaintenanceConnectionArgs
  ): Promise<PeriodicMaintenanceConnection> {
    try {
      const { limit, offset } = getPagingParameters(args);
      const limitPlusOne = limit + 1;
      const {
        search,
        type2Ids,
        measurement,
        locationIds,
        zoneIds,
        divisionIds,
        gteInterService,
        lteInterService,
        pmStatus,
        from,
        to,
      } = args;

      // eslint-disable-next-line prefer-const
      let where: any = { AND: [] };
      const todayStart = moment(from).startOf('day');
      const todayEnd = moment(to).endOf('day');

      where.AND.push({
        removedAt: null,
        entityId: { not: null },
      });

      if (search) {
        const or: any = [
          { entity: { model: { contains: search, mode: 'insensitive' } } },
          {
            entity: {
              machineNumber: { contains: search, mode: 'insensitive' },
            },
          },
          { name: { contains: search, mode: 'insensitive' } },
        ];
        // If search contains all numbers, search the machine ids as well
        if (/^(0|[1-9]\d*)$/.test(search)) {
          or.push({ id: parseInt(search) });
        }
        where.AND.push({
          OR: or,
        });
      }

      if (type2Ids?.length > 0) {
        where.AND.push({
          entity: { typeId: { in: type2Ids } },
        });
      }

      if (measurement?.length > 0) {
        where.AND.push({
          entity: { measurement: { in: measurement } },
        });
      }

      if (locationIds?.length > 0) {
        where.AND.push({
          entity: { locationId: { in: locationIds } },
        });
      }

      if (zoneIds?.length > 0) {
        where.AND.push({ entity: { location: { zoneId: { in: zoneIds } } } });
      }

      if (divisionIds?.length > 0) {
        where.AND.push({
          entity: { divisionId: { in: divisionIds } },
        });
      }

      if (pmStatus?.length > 0) {
        where.AND.push({
          status: { in: pmStatus },
        });
      }

      if (gteInterService?.replace(/\D/g, '')) {
        where.AND.push({
          entity: {
            interService: { gte: parseInt(gteInterService.replace(/\D/g, '')) },
          },
        });
      }

      if (lteInterService?.replace(/\D/g, '')) {
        where.AND.push({
          entity: {
            interService: { lte: parseInt(lteInterService.replace(/\D/g, '')) },
          },
        });
      }

      if (
        gteInterService?.replace(/\D/g, '') &&
        lteInterService?.replace(/\D/g, '')
      ) {
        where.AND.push({
          entity: {
            interService: {
              gte: parseInt(gteInterService.replace(/\D/g, '')),
              lte: parseInt(lteInterService.replace(/\D/g, '')),
            },
          },
        });
      }
      if (from) {
        where.AND.push({
          createdAt: { gte: todayStart.toDate() },
        });
      }

      if (to) {
        where.AND.push({
          createdAt: { lte: todayEnd.toDate() },
        });
      }
      if (from && to) {
        where.AND.push({
          createdAt: { gte: todayStart.toDate(), lte: todayEnd.toDate() },
        });
      }

      const newPeriodicMaintenances = [];
      const pm = await this.prisma.periodicMaintenance.findMany({
        where,
        include: {
          entity: {
            include: {
              type: {
                include: {
                  interServiceColor: {
                    where: { removedAt: null },
                    include: { brand: true, type: true },
                  },
                },
              },
              brand: true,
            },
          },
        },
        orderBy: [{ id: 'desc' }],
      });
      //get all pm that doesn't have green color in interservice
      for (const p of pm) {
        const interService =
          (p?.entity?.currentRunning ? p?.entity?.currentRunning : 0) -
          (p?.entity?.lastService ? p?.entity?.lastService : 0);
        if (p.entity?.type?.interServiceColor.length > 0) {
          for (const intColor of p.entity.type.interServiceColor) {
            if (
              intColor?.brand?.name === p?.entity?.brand?.name &&
              intColor?.type?.name === p?.entity?.type?.name &&
              intColor?.measurement === p?.entity?.measurement
            ) {
              if (
                interService >= intColor?.lessThan &&
                interService <= intColor?.greaterThan
              ) {
                newPeriodicMaintenances.push(p);
              } else if (interService >= intColor?.greaterThan) {
                newPeriodicMaintenances.push(p);
              }
            }
          }
        }
      }
      const newPeriodicMaintenanceIds = newPeriodicMaintenances.map(
        (p) => p.id
      );
      const entities = await this.prisma.entity.findMany({
        skip: offset,
        take: limitPlusOne,
        where: {
          periodicMaintenances: {
            some: {
              id: { in: newPeriodicMaintenanceIds },
            },
          },
        },
        include: {
          periodicMaintenances: {
            include: { verifiedBy: true },
            where,
          },
        },
        orderBy: [{ id: 'desc' }],
      });
      let completed = 0;
      let ongoing = 0;
      let upcoming = 0;
      let overdue = 0;
      entities.map((e) => {
        e?.periodicMaintenances?.filter((e) => {
          if (e.status === 'Completed') {
            completed += 1;
          } else if (e.status === 'Ongoing') {
            ongoing += 1;
          } else if (e.status === 'Upcoming') {
            upcoming += 1;
          } else if (e.status === 'Overdue') {
            overdue += 1;
          }
        });
      });

      const statusCount = {
        completed,
        ongoing,
        upcoming,
        overdue,
      };
      return statusCount;
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async periodicMaintenancesCalendar(
    user: User,
    args: PeriodicMaintenanceConnectionArgs
  ): Promise<Entity[]> {
    try {
      const {
        search,
        type2Ids,
        measurement,
        locationIds,
        zoneIds,
        divisionIds,
        gteInterService,
        lteInterService,
        pmStatus,
        from,
        to,
      } = args;

      // eslint-disable-next-line prefer-const
      let where: any = { AND: [] };
      // eslint-disable-next-line prefer-const
      let where2: any = { AND: [] };
      const todayStart = moment(from).startOf('day');
      const todayEnd = moment(to).endOf('day');

      where.AND.push({
        deletedAt: null,
        machineNumber: { not: null },
        parentEntityId: null,
      });
      where2.AND.push({
        removedAt: null,
        entityId: { not: null },
        currentMeterReading: { not: null },
        type: 'Copy',
      });
      if (search) {
        const or: any = [
          { model: { contains: search, mode: 'insensitive' } },
          {
            machineNumber: { contains: search, mode: 'insensitive' },
          },
        ];
        // If search contains all numbers, search the machine ids as well
        if (/^(0|[1-9]\d*)$/.test(search)) {
          or.push({ id: parseInt(search) });
        }
        where.AND.push({
          OR: or,
        });
      }

      if (type2Ids?.length > 0) {
        where.AND.push({
          typeId: { in: type2Ids },
        });
      }

      if (measurement?.length > 0) {
        where.AND.push({
          measurement: { in: measurement },
        });
      }

      if (locationIds?.length > 0) {
        where.AND.push({
          locationId: { in: locationIds },
        });
      }

      if (zoneIds?.length > 0) {
        where.AND.push({ location: { zoneId: { in: zoneIds } } });
      }

      if (divisionIds?.length > 0) {
        where.AND.push({
          divisionId: { in: divisionIds },
        });
      }

      if (pmStatus?.length > 0) {
        where2.AND.push({
          status: { in: pmStatus },
        });
      }

      if (gteInterService?.replace(/\D/g, '')) {
        where.AND.push({
          interService: { gte: parseInt(gteInterService.replace(/\D/g, '')) },
        });
      }

      if (lteInterService?.replace(/\D/g, '')) {
        where.AND.push({
          interService: { lte: parseInt(lteInterService.replace(/\D/g, '')) },
        });
      }

      if (
        gteInterService?.replace(/\D/g, '') &&
        lteInterService?.replace(/\D/g, '')
      ) {
        where.AND.push({
          interService: {
            gte: parseInt(gteInterService.replace(/\D/g, '')),
            lte: parseInt(lteInterService.replace(/\D/g, '')),
          },
        });
      }

      if (from) {
        where2.AND.push({
          createdAt: { gte: todayStart.toDate() },
        });
      }

      if (to) {
        where2.AND.push({
          createdAt: { lte: todayEnd.toDate() },
        });
      }
      if (from && to) {
        where2.AND.push({
          createdAt: { gte: todayStart.toDate(), lte: todayEnd.toDate() },
        });
      }

      const entities = await this.prisma.entity.findMany({
        where,
        include: {
          periodicMaintenances: {
            where: where2,
            take: 1,
          },
          type: true,
          location: { include: { zone: true } },
        },
        orderBy: { machineNumber: 'asc' },
      });

      return entities as unknown as Entity[];
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }
}
