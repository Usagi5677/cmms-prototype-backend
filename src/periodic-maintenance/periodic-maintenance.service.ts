import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import * as moment from 'moment';
import { PeriodicMaintenance as PeriodicMaintenanceModel } from './dto/models/periodic-maintenance.model';
import { EntityService } from 'src/entity/entity.service';
import { PeriodicMaintenanceInput } from './dto/inputs/periodic-maintenance.input';
import { User } from 'src/models/user.model';
import { Cron, CronExpression } from '@nestjs/schedule';
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

@Injectable()
export class PeriodicMaintenanceService {
  private readonly logger = new Logger(PeriodicMaintenanceService.name);
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => EntityService))
    private entityService: EntityService,
    private userService: UserService,
    private notificationService: NotificationService
  ) {}

  async findOne({ entityId, from, to }: PeriodicMaintenanceInput) {
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
  }

  async findAll(
    user: User,
    args: PeriodicMaintenanceConnectionArgs
  ): Promise<PeriodicMaintenanceConnection> {
    const hasPermission = await this.userService.checkUserPermission(
      user.id,
      'VIEW_TEMPLATES',
      true
    );
    // If user does not have the permission, check if they are assigned as
    // admin to any entity.
    if (!hasPermission) {
      await this.entityService.checkAllEntityAssignments(user.id, ['Admin']);
    }
    const { limit, offset } = getPagingParameters(args);
    const limitPlusOne = limit + 1;
    const { search, type, from, to, entityId } = args;
    const fromDate = moment(from).startOf('day');
    const toDate = moment(to).endOf('day');
    const where: any = {};
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
      orderBy: { updatedAt: 'desc' },
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
    previousMeterReading?: number,
    currentMeterReading?: number
  ) {
    try {
      await this.prisma.periodicMaintenance.create({
        data: {
          name,
          measurement,
          value,
          previousMeterReading,
          currentMeterReading,
          type: 'Origin',
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
    previousMeterReading?: number,
    currentMeterReading?: number
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
          value,
          previousMeterReading,
          currentMeterReading,
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
    try {
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
        where: {
          id,
        },
        select: {
          entityId: true,
        },
      });
      await this.prisma.periodicMaintenance.update({
        where: { id },
        data: verify
          ? { verifiedById: user.id, verifiedAt: new Date() }
          : { verifiedById: null, verifiedAt: null },
      });

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
            previousMeterReading: originPM.previousMeterReading,
            currentMeterReading: originPM.currentMeterReading,
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
        this.createInnerTasks(originPM, template);
      }
    }
  }

  //** Delete periodic maintenance. */
  async deletePeriodicMaintenance(user: User, id: number) {
    try {
      await this.prisma.periodicMaintenance.delete({
        where: { id },
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
      where: { entityId, originId },
    });
    if (templateExist) {
      throw new BadRequestException('Template already exist.');
    }
    const entity = await this.prisma.entity.findFirst({
      where: { id: entityId },
    });
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
          previousMeterReading: entity.currentRunning,
          currentMeterReading: entity.currentRunning,
          type: 'Template',
        },
      });

      this.createInnerTasks(pm, newPM);

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

      //run generate again so copies will be made
      this.generatePeriodicMaintenances();
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
  }

  async updatePeriodicMaintenanceReading(
    user: User,
    id: number,
    reading: number
  ) {
    const periodicMaintenance = await this.prisma.periodicMaintenance.findFirst(
      {
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
      }
    );
    await this.entityService.checkEntityAssignmentOrPermission(
      periodicMaintenance.entity.id,
      user.id,
      undefined,
      []
    );
    const prevReading = periodicMaintenance.entity?.currentRunning ?? 0;
    //update copy with new values. (Not necessary to update previous reading for copies)
    await this.prisma.periodicMaintenance.update({
      where: { id },
      data: { currentMeterReading: reading, previousMeterReading: prevReading },
    });

    //update the template as well so that it will make copy when it fulfills the requirement
    await this.prisma.periodicMaintenance.update({
      where: {
        id: periodicMaintenance.originId,
      },
      data: { currentMeterReading: reading, previousMeterReading: prevReading },
    });
  }

  async addPeriodicMaintenanceComment(
    user: User,
    type: string,
    periodicMaintenanceId: number,
    taskId: number,
    description: string
  ) {
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
  }

  async removePeriodicMaintenanceComment(user: User, id: number) {
    const comment = await this.prisma.periodicMaintenanceComment.findFirst({
      where: { id },
      select: { createdById: true },
    });
    if (comment.createdById !== user.id) {
      throw new ForbiddenError("Cannot delete other user's comments.");
    }
    await this.prisma.periodicMaintenanceComment.delete({ where: { id } });
  }

  async periodicMaintenanceSummary(
    entityId: number,
    from: Date,
    to: Date
  ): Promise<PeriodicMaintenanceSummary[]> {
    await this.entityService.findOne(entityId);

    const fromDate = moment(from).startOf('day');
    const toDate = moment(to).endOf('day');

    const where: any = {};
    if (true) {
      where.type = 'Copy';
    }

    if (from && to) {
      where.createdAt = { gte: fromDate.toDate(), lte: toDate.toDate() };
    }

    if (entityId) {
      where.entityId = entityId;
    }

    const periodicMaintenances = await this.prisma.periodicMaintenance.findMany(
      {
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
      }
    );
    const summaries: PeriodicMaintenanceSummary[] = [];
    for (const pm of periodicMaintenances) {
      const summary = new PeriodicMaintenanceSummary();
      Object.assign(summary, pm);
      if (pm.tasks.length === 0) {
        summary.taskCompletion = 'empty';
      } else if (pm.tasks.flat(2).every((task) => task.completedAt !== null)) {
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
  }

  //update or create reminder
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

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async generatePeriodicMaintenancesCron() {
    this.logger.verbose('Periodic Maintenance generation cron job started');
    // Temporarily running as direct function call
    // Should be run in the background by a queue instead
    await this.generatePeriodicMaintenances();
  }

  async generatePeriodicMaintenances() {
    //using original periodic maintenance as template to make its copies

    // Get ids of all pm template
    const periodicMaintenance = await this.prisma.periodicMaintenance.findMany({
      where: { type: 'Template' },
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
        const previousReading = pm.previousMeterReading;
        const currentReading = pm.currentMeterReading;
        const computedReading = await this.entityService.getLatestReading(
          pm.entity
        );
        const readingDiff = Math.abs(currentReading - previousReading);
        const computedReadingDiff = Math.abs(computedReading - previousReading);
        //if difference is more than or equal it means it's ready to be made
        const flag = readingDiff >= pm.value || computedReadingDiff >= pm.value;
        if (flag) {
          this.createPM(pm);
        }
      } else if (pm.measurement === 'Kilometer') {
        const previousReading = pm.previousMeterReading;
        const currentReading = pm.currentMeterReading;
        const computedReading = await this.entityService.getLatestReading(
          pm.entity
        );
        const readingDiff = Math.abs(currentReading - previousReading);
        const computedReadingDiff = Math.abs(computedReading - previousReading);
        //if difference is more than or equal it means it's ready to be made
        const flag = readingDiff >= pm.value || computedReadingDiff >= pm.value;
        if (flag) {
          this.createPM(pm);
        }
      } else if (pm.measurement === 'Day') {
        const todayStart = moment().startOf('day');
        const createdAtStart = moment(pm.createdAt).startOf('day');
        const diff = Math.abs(todayStart.diff(createdAtStart, 'days'));
        const flag = diff % pm.value;
        if (flag == 0) {
          this.createPM(pm);
        }
      } else if (pm.measurement === 'Week') {
        const todayStart = moment().startOf('day');
        const createdAtStart = moment(pm.createdAt).startOf('day');
        const diff = Math.abs(todayStart.diff(createdAtStart, 'days'));
        //multiplying by 7 since a week has 7 days
        const flag = diff % (pm.value * 7);
        if (flag == 0) {
          this.createPM(pm);
        }
      } else if (pm.measurement === 'Month') {
        const todayStart = moment().startOf('day');
        const createdAtStart = moment(pm.createdAt).startOf('day');
        const diff = Math.abs(todayStart.diff(createdAtStart, 'days'));
        //multiplying by 30 since a month has 30 days
        const flag = diff % (pm.value * 30);
        if (flag == 0) {
          this.createPM(pm);
        }
      }
    }
    this.logger.verbose('Periodic Maintenance generation complete');
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async notificationReminderCrons() {
    this.logger.verbose('Notification reminder cron job started');
    await this.notificationReminder();
  }

  async notificationReminder() {
    // Get ids of all pm template
    const templatePeriodicMaintenance =
      await this.prisma.periodicMaintenance.findMany({
        where: { type: 'Template' },
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

  async createPM(pm: PeriodicMaintenanceWithTasks) {
    const todayStart = moment().startOf('day');
    const todayEnd = moment().endOf('day');
    try {
      //when pm copy is created it will use same reading.
      //so it won't make a copy when template created because it doesn't fulfill the requirements eg. hour, km
      const copyPM = await this.prisma.periodicMaintenance.create({
        data: {
          from: todayStart.toDate(),
          to: todayEnd.toDate(),
          name: pm.name,
          entityId: pm.entityId,
          originId: pm.id,
          measurement: pm.measurement,
          value: pm.value,
          previousMeterReading: pm.previousMeterReading,
          type: 'Copy',
        },
      });

      this.createInnerTasks(pm, copyPM);
    } catch (e) {
      console.log(e);
    }
  }

  async createInnerTasks(
    pm: PeriodicMaintenanceWithTasks,
    copyPM: PeriodicMaintenanceWithTasks | PeriodicMaintenanceModel
  ) {
    let level1;
    let level2;
    for (let index = 0; index < pm.tasks.length; index++) {
      level1 = await this.prisma.periodicMaintenanceTask.create({
        data: {
          periodicMaintenanceId: copyPM.id,
          name: pm.tasks[index].name,
        },
      });
      for (let index2 = 0; index2 < pm.tasks[index].subTasks.length; index2++) {
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
}
