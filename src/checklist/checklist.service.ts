import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as moment from 'moment';
import { ChecklistTemplateService } from 'src/resolvers/checklist-template/checklist-template.service';
import { ChecklistInput } from './dto/checklist.input';
import { Checklist } from '@prisma/client';
import { User } from 'src/models/user.model';
import { ChecklistSummaryInput } from './dto/checklist-summary.input';
import { ChecklistSummary } from './dto/checklist-summary';
import { EntityService } from 'src/entity/entity.service';
import { ForbiddenError } from 'apollo-server-express';
import { IncompleteChecklistSummaryInput } from './dto/incomplete-checklist-summary.input';
import { IncompleteChecklistInput } from './dto/incomplete-checklist.input';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ChecklistService {
  private readonly logger = new Logger(ChecklistService.name);
  constructor(
    private prisma: PrismaService,
    private checklistTemplateService: ChecklistTemplateService,
    @Inject(forwardRef(() => EntityService))
    private entityService: EntityService
  ) {}

  async findOne({ entityId, type, date }: ChecklistInput) {
    try {
      await this.entityService.findOne(entityId);
      let checklist: null | Checklist = null;
      let from = moment(date).startOf('day').toDate();
      let to = moment(date).endOf('day').toDate();
      if (type === 'Weekly') {
        from = moment(date).startOf('week').toDate();
        to = moment(date).endOf('week').toDate();
      }
      checklist = await this.prisma.checklist.findFirst({
        where: {
          entityId,
          from,
          to,
          type,
        },
        include: {
          items: {
            include: { completedBy: true, issues: { include: { user: true } } },
            orderBy: { id: 'asc' },
          },
          comments: {
            where: { type: 'Comment' },
            include: {
              user: true,
            },
            orderBy: { id: 'desc' },
          },
          attachments: {
            include: {
              user: true,
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });
      return checklist;
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  // Check if old checklist and throw error
  async checkIfOldChecklist(checklistId: number, to?: Date) {
    try {
      if (!to) {
        to = (
          await this.prisma.checklist.findFirst({
            where: { id: checklistId },
            select: { to: true },
          })
        ).to;
      }
      const now = moment();
      if (moment(to).isBefore(now, 'second')) {
        throw new BadRequestException('Cannot update older checklists.');
      }
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Set checklist item as complete or incomplete. */
  async toggleChecklistItem(user: User, id: number, complete: boolean) {
    try {
      const checklistItem = await this.prisma.checklistItem.findFirst({
        where: { id },
        select: { checklistId: true },
      });
      const checklist = await this.prisma.checklist.findFirst({
        where: { id: checklistItem.checklistId },
        select: { entityId: true },
      });
      await this.entityService.checkEntityAssignmentOrPermission(
        checklist.entityId,
        user.id,
        undefined,
        []
      );
      await this.prisma.checklistItem.update({
        where: { id },
        data: complete
          ? { completedById: user.id, completedAt: new Date() }
          : { completedById: null, completedAt: null },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async updateWorkingHours(user: User, id: number, newHrs: number) {
    try {
      const checklist = await this.prisma.checklist.findFirst({
        where: { id },
        include: { entity: true },
      });
      await this.entityService.checkEntityAssignmentOrPermission(
        checklist.entityId,
        user.id,
        undefined,
        []
      );
      await this.prisma.checklist.update({
        where: { id },
        data: { workingHour: newHrs, currentMeterReading: null },
      });

      const latestReading = await this.entityService.getLatestReading(
        checklist?.entity
      );
      const interService = latestReading - checklist.entity.lastService;
      //update interservice so that filter will work
      await this.prisma.entity.update({
        where: { id: checklist.entityId },
        data: { interService, currentRunningUpdateAt: new Date() },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async updateReading(user: User, id: number, reading: number) {
    try {
      const checklist = await this.prisma.checklist.findFirst({
        where: { id },
        include: { entity: true },
      });
      await this.entityService.checkEntityAssignmentOrPermission(
        checklist.entityId,
        user.id,
        undefined,
        []
      );
      await this.prisma.checklist.update({
        where: { id },
        data: { currentMeterReading: reading, workingHour: null },
      });
      const latestReading = await this.entityService.getLatestReading(
        checklist?.entity
      );
      const interService = latestReading - checklist.entity.lastService;
      //update interservice so that filter will work
      await this.prisma.entity.update({
        where: { id: checklist.entityId },
        data: { interService, currentRunningUpdateAt: new Date() },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async updateDailyUsage(user: User, id: number, hours: number) {
    try {
      const checklist = await this.prisma.checklist.findFirst({
        where: { id },
        include: { entity: true },
      });
      await this.entityService.checkEntityAssignmentOrPermission(
        checklist.entityId,
        user.id,
        undefined,
        []
      );
      await this.prisma.checklist.update({
        where: { id },
        data: { dailyUsageHours: hours },
      });
      const latestReading = await this.entityService.getLatestReading(
        checklist?.entity
      );
      const interService = latestReading - checklist.entity.lastService;
      //update interservice so that filter will work
      await this.prisma.entity.update({
        where: { id: checklist.entityId },
        data: { interService, currentRunningUpdateAt: new Date() },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async incompleteChecklists(
    user: User,
    { date, type, isAssigned }: IncompleteChecklistInput
  ): Promise<Checklist[] | null> {
    try {
      let from;
      let to;
      if (type === 'Daily') {
        from = moment(date).startOf('day').toDate();
        to = moment(date).endOf('day').toDate();
      } else {
        from = moment(date).startOf('week').toDate();
        to = moment(date).endOf('week').toDate();
      }
      const checkStatus = ['Working', 'Critical'];
      const checklist = await this.prisma.checklist.findMany({
        where: {
          type,
          NOT: [{ entityId: null }],
          from: { gte: from },
          to: { lte: to },
          OR: { currentMeterReading: null, workingHour: null, type },
        },
        select: {
          id: true,
        },
      });

      const checklistIds = checklist.map((id) => id.id);

      const checklistItem = await this.prisma.checklistItem.findMany({
        where: {
          checklistId: {
            in: checklistIds,
          },
          completedAt: null,
        },
        select: {
          checklistId: true,
        },
      });
      const checklistItemIds = checklistItem.map((id) => id.checklistId);

      const newChecklist = await this.prisma.checklist.findMany({
        where: {
          id: {
            in: checklistItemIds,
          },
        },
        select: {
          id: true,
          entityId: true,
        },
      });
      // eslint-disable-next-line prefer-const
      let where: any = { AND: [] };
      where.AND.push({
        deletedAt: null,
        status: { in: checkStatus },
      });
      if (isAssigned) {
        const assignments = await this.prisma.entityAssignment.findMany({
          where: {
            removedAt: null,
            userId: user.id,
            type: { in: ['Admin', 'User'] },
          },
        });
        where.AND.push({ id: { in: assignments.map((a) => a.entityId) } });
      }
      const entities = await this.prisma.entity.findMany({
        where,
        select: { id: true },
      });
      const workingIds = newChecklist.filter((e) =>
        entities.some((b) => e.entityId === b.id)
      );

      const newChecklistIds = workingIds.map((e) => e.id);

      const checklists = await this.prisma.checklist.findMany({
        where: {
          id: { in: newChecklistIds },
        },
        include: {
          entity: { include: { type: true, location: true } },
          items: true,
          comments: true,
        },
      });
      return checklists;
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async incompleteChecklistSummary(
    user: User,
    { type, from, to, isAssigned }: IncompleteChecklistSummaryInput
  ) {
    try {
      const start = moment(from);
      const end = moment(to);
      const checklist = await this.prisma.checklist.findMany({
        where: {
          type,
          NOT: [{ entityId: null }],
          from: { gte: start.startOf('day').toDate() },
          to: { lte: end.endOf(type === 'Daily' ? 'day' : 'week').toDate() },
          OR: { currentMeterReading: null, workingHour: null, type },
        },
        select: {
          id: true,
        },
      });

      const checklistIds = checklist.map((id) => id.id);

      const checklistItem = await this.prisma.checklistItem.findMany({
        where: {
          checklistId: {
            in: checklistIds,
          },
          completedAt: null,
        },
        select: {
          checklistId: true,
        },
      });
      const checklistItemIds = checklistItem.map((id) => id.checklistId);

      const newChecklist = await this.prisma.checklist.findMany({
        where: {
          id: {
            in: checklistItemIds,
          },
        },
        select: {
          id: true,
          entityId: true,
        },
      });
      const checkStatus = ['Working', 'Critical'];
      // eslint-disable-next-line prefer-const
      let where: any = { AND: [] };
      where.AND.push({
        deletedAt: null,
        status: { in: checkStatus },
      });
      if (isAssigned) {
        const assignments = await this.prisma.entityAssignment.findMany({
          where: {
            removedAt: null,
            userId: user.id,
            type: { in: ['Admin', 'User'] },
          },
        });
        where.AND.push({ id: { in: assignments.map((a) => a.entityId) } });
      }
      const entities = await this.prisma.entity.findMany({
        where,
        select: { id: true },
      });
      const workingIds = newChecklist.filter((e) =>
        entities.some((b) => e.entityId === b.id)
      );

      const newChecklistIds = workingIds.map((e) => e.id);

      const checklists = await this.prisma.checklist.findMany({
        where: {
          id: { in: newChecklistIds },
        },
      });
      if (type === 'Daily') {
        const checklistByDay = [];
        const days = end.diff(start, 'day') + 1;
        for (let i = 0; i < days; i++) {
          const checklistStart = moment(from).add(i, 'day').startOf('day');
          const checklistEnd = moment(from).add(i, 'day').endOf('day');
          checklistByDay.push({
            date: checklistStart.toISOString(),
            count: checklists.filter(
              (checklist) =>
                moment(checklist.from).isSame(checklistStart) &&
                moment(checklist.to).isSame(checklistEnd)
            ).length,
          });
        }
        return checklistByDay;
      } else {
        const checklistByWeek = [];
        const weeks = end.diff(start, 'week') + 1;
        for (let i = 0; i < weeks; i++) {
          const checklistStart = moment(from).add(i, 'week').startOf('week');
          const checklistEnd = moment(from).add(i, 'week').endOf('week');
          checklistByWeek.push({
            date: checklistStart,
            count: checklists.filter(
              (checklist) =>
                moment(checklist.from).isSame(checklistStart) &&
                moment(checklist.to).isSame(checklistEnd)
            ).length,
          });
        }
        return checklistByWeek;
      }
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //checklists with issue
  async checklistsWithIssue(
    user: User,
    { date, type, isAssigned }: IncompleteChecklistInput
  ): Promise<Checklist[] | null> {
    try {
      let from;
      let to;
      if (type === 'Daily') {
        from = moment(date).startOf('day').toDate();
        to = moment(date).endOf('day').toDate();
      } else {
        from = moment(date).startOf('week').toDate();
        to = moment(date).endOf('week').toDate();
      }

      const checklist = await this.prisma.checklist.findMany({
        where: {
          type,
          NOT: [{ entityId: null }],
          from: { gte: from },
          to: { lte: to },
        },
        select: {
          id: true,
        },
      });

      const checklistIds = checklist.map((id) => id.id);

      const checklistComment = await this.prisma.checklistComment.findMany({
        where: {
          checklistId: {
            in: checklistIds,
          },
          type: 'Issue',
        },
        select: {
          checklistId: true,
        },
      });
      const checklistCommentIds = checklistComment.map((id) => id.checklistId);

      const newChecklist = await this.prisma.checklist.findMany({
        where: {
          id: {
            in: checklistCommentIds,
          },
        },
        select: {
          id: true,
          entityId: true,
        },
      });
      const checkStatus = ['Working', 'Critical'];
      // eslint-disable-next-line prefer-const
      let where: any = { AND: [] };
      where.AND.push({
        deletedAt: null,
        status: { in: checkStatus },
      });
      if (isAssigned) {
        const assignments = await this.prisma.entityAssignment.findMany({
          where: {
            removedAt: null,
            userId: user.id,
            type: { in: ['Admin', 'Engineer'] },
          },
        });
        where.AND.push({ id: { in: assignments.map((a) => a.entityId) } });
      }
      const entities = await this.prisma.entity.findMany({
        where,
        select: { id: true },
      });
      const workingIds = newChecklist.filter((e) =>
        entities.some((b) => e.entityId === b.id)
      );

      const newChecklistIds = workingIds.map((e) => e.id);

      const checklists = await this.prisma.checklist.findMany({
        where: {
          id: { in: newChecklistIds },
        },
        include: {
          entity: { include: { type: true, location: true } },
          items: true,
          comments: true,
        },
      });
      return checklists;
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //summary of checklists with issue
  async checklistWithIssueSummary(
    user: User,
    { type, from, to, isAssigned }: IncompleteChecklistSummaryInput
  ) {
    try {
      const start = moment(from);
      const end = moment(to);
      const checklist = await this.prisma.checklist.findMany({
        where: {
          type,
          NOT: [{ entityId: null }],
          from: { gte: start.startOf('day').toDate() },
          to: { lte: end.endOf(type === 'Daily' ? 'day' : 'week').toDate() },
        },
        select: {
          id: true,
        },
      });

      const checklistIds = checklist.map((id) => id.id);

      const checklistComment = await this.prisma.checklistComment.findMany({
        where: {
          checklistId: {
            in: checklistIds,
          },
          type: 'Issue',
        },
        select: {
          checklistId: true,
        },
      });
      const checklistCommentIds = checklistComment.map((id) => id.checklistId);

      const newChecklist = await this.prisma.checklist.findMany({
        where: {
          id: {
            in: checklistCommentIds,
          },
        },
        select: {
          id: true,
          entityId: true,
        },
      });
      const checkStatus = ['Working', 'Critical'];
      // eslint-disable-next-line prefer-const
      let where: any = { AND: [] };
      where.AND.push({
        deletedAt: null,
        status: { in: checkStatus },
      });
      if (isAssigned) {
        const assignments = await this.prisma.entityAssignment.findMany({
          where: {
            removedAt: null,
            userId: user.id,
            type: { in: ['Admin', 'Engineer'] },
          },
        });
        where.AND.push({ id: { in: assignments.map((a) => a.entityId) } });
      }
      const entities = await this.prisma.entity.findMany({
        where,
        select: { id: true },
      });
      const workingIds = newChecklist.filter((e) =>
        entities.some((b) => e.entityId === b.id)
      );

      const newChecklistIds = workingIds.map((e) => e.id);

      const checklists = await this.prisma.checklist.findMany({
        where: {
          id: { in: newChecklistIds },
        },
      });
      if (type === 'Daily') {
        const checklistByDay = [];
        const days = end.diff(start, 'day') + 1;
        for (let i = 0; i < days; i++) {
          const checklistStart = moment(from).add(i, 'day').startOf('day');
          const checklistEnd = moment(from).add(i, 'day').endOf('day');
          checklistByDay.push({
            date: checklistStart.toISOString(),
            count: checklists.filter(
              (checklist) =>
                moment(checklist.from).isSame(checklistStart) &&
                moment(checklist.to).isSame(checklistEnd)
            ).length,
          });
        }
        return checklistByDay;
      } else {
        const checklistByWeek = [];
        const weeks = end.diff(start, 'week') + 1;
        for (let i = 0; i < weeks; i++) {
          const checklistStart = moment(from).add(i, 'week').startOf('week');
          const checklistEnd = moment(from).add(i, 'week').endOf('week');
          checklistByWeek.push({
            date: checklistStart,
            count: checklists.filter(
              (checklist) =>
                moment(checklist.from).isSame(checklistStart) &&
                moment(checklist.to).isSame(checklistEnd)
            ).length,
          });
        }
        return checklistByWeek;
      }
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async generateChecklistsCron() {
    this.logger.verbose('Checklist generation cron job started');
    // Temporarily running as direct function call
    // Should be run in the background by a queue instead
    await this.generateChecklists();
  }

  async generateChecklists() {
    try {
      const checkStatus = ['Working', 'Critical'];
      // Get ids of all entities that are working
      const entities = await this.prisma.entity.findMany({
        where: { status: { in: checkStatus }, deletedAt: null, transit: false },
        select: {
          id: true,
          location: true,
          measurement: true,
        },
      });
      const skipFridayEntities = entities.filter((e) => {
        if (e?.location?.skipFriday && moment().toDate().getDay() === 5) {
          return e;
        }
      });

      const skipFridayIds = skipFridayEntities.map((m) => m.id);

      // Find ids of entities whose measurement is in days
      const dayUnitEntities = entities.filter((e) => e.measurement === 'days');
      const dayUnitEntityIds = new Set(dayUnitEntities.map((e) => e.id));

      const entityIds = entities.map((m) => m.id);

      const skipFridayEntityIds = entityIds.filter(
        (id) => !skipFridayIds.includes(id)
      );

      // Daily
      const todayStart = moment().startOf('day');
      const todayEnd = moment().endOf('day');

      // Get all daily checklists that have been generated
      const todayChecklists = await this.prisma.checklist.findMany({
        where: {
          type: 'Daily',
          from: todayStart.toDate(),
          to: todayEnd.toDate(),
        },
        select: { entityId: true },
      });
      const todayChecklistEntityIds = todayChecklists.map((c) => c.entityId);

      // Create daily checklists for entity
      const notGeneratedDailyEntityIds = skipFridayEntityIds.filter(
        (id) => !todayChecklistEntityIds.includes(id)
      );

      for (const entityId of notGeneratedDailyEntityIds) {
        const dailyTemplate =
          await this.checklistTemplateService.entityChecklistTemplate({
            entityId,
            type: 'Daily',
          });
        // eslint-disable-next-line prefer-const
        let data: any = {
          type: 'Daily',
          entityId,
          from: todayStart.toDate(),
          to: todayEnd.toDate(),
          items: {
            createMany: {
              data: dailyTemplate.items.map((item) => ({
                description: item.name,
              })),
            },
          },
        };
        // If entity's measurement is in days, automatically update daily reading
        // with a value of 1
        if (dayUnitEntityIds.has(entityId)) {
          data.workingHour = 1;
        }
        await this.prisma.checklist.create({ data });
      }

      // Weekly
      const weekStart = moment().startOf('week');
      const weekEnd = moment().endOf('week');

      // Get all of this week's checklists that have been generated
      const thisWeekChecklists = await this.prisma.checklist.findMany({
        where: {
          type: 'Weekly',
          from: weekStart.toDate(),
          to: weekEnd.toDate(),
        },
        select: { entityId: true },
      });
      const thisWeekEntityIds = thisWeekChecklists.map((c) => c.entityId);

      // Create weekly checklists for entities
      const notGeneratedWeeklyEntityIds = skipFridayEntityIds.filter(
        (id) => !thisWeekEntityIds.includes(id)
      );
      for (const entityId of notGeneratedWeeklyEntityIds) {
        const weeklyTemplate =
          await this.checklistTemplateService.entityChecklistTemplate({
            entityId,
            type: 'Weekly',
          });
        await this.prisma.checklist.create({
          data: {
            type: 'Weekly',
            entityId,
            from: weekStart.toDate(),
            to: weekEnd.toDate(),
            items: {
              createMany: {
                data: weeklyTemplate.items.map((item) => ({
                  description: item.name,
                })),
              },
            },
          },
        });
      }
      this.logger.verbose('Checklist generation complete');
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async generateSingleChecklist(entityId: number) {
    try {
      // Get ids of all entities that are working
      const entity = await this.prisma.entity.findFirst({
        where: { id: entityId, deletedAt: null },
        select: {
          id: true,
          location: true,
          status: true,
          transit: true,
        },
      });
      if (!entity) {
        throw new BadRequestException(`Entity does not exist.`);
      }
      if (entity?.location?.skipFriday && moment().toDate().getDay() === 5) {
        throw new BadRequestException(
          `This entity cannot generate checklist on Friday.`
        );
      }
      if (entity?.transit) {
        throw new BadRequestException(
          `Entity cannot generate checklist while in transit.`
        );
      }
      if (entity?.status === 'Breakdown') {
        throw new BadRequestException(
          `Entity cannot generate checklist while in breakdown.`
        );
      }

      // Daily
      const todayStart = moment().startOf('day');
      const todayEnd = moment().endOf('day');
      // Get daily checklist that have been generated
      const todayChecklist = await this.prisma.checklist.findFirst({
        where: {
          type: 'Daily',
          from: todayStart.toDate(),
          to: todayEnd.toDate(),
          entityId,
        },
        select: { entityId: true },
      });

      // Weekly
      const weekStart = moment().startOf('week');
      const weekEnd = moment().endOf('week');
      // Get week checklist that have been generated
      const thisWeekChecklist = await this.prisma.checklist.findFirst({
        where: {
          type: 'Weekly',
          from: weekStart.toDate(),
          to: weekEnd.toDate(),
          entityId,
        },
        select: { entityId: true },
      });

      if (todayChecklist || thisWeekChecklist) {
        throw new BadRequestException(`Checklist already generated.`);
      }
      if (!todayChecklist) {
        const dailyTemplate =
          await this.checklistTemplateService.entityChecklistTemplate({
            entityId,
            type: 'Daily',
          });
        await this.prisma.checklist.create({
          data: {
            type: 'Daily',
            entityId,
            from: todayStart.toDate(),
            to: todayEnd.toDate(),
            items: {
              createMany: {
                data: dailyTemplate.items.map((item) => ({
                  description: item.name,
                })),
              },
            },
          },
        });
      }

      if (!thisWeekChecklist) {
        const weeklyTemplate =
          await this.checklistTemplateService.entityChecklistTemplate({
            entityId,
            type: 'Weekly',
          });
        await this.prisma.checklist.create({
          data: {
            type: 'Weekly',
            entityId,
            from: weekStart.toDate(),
            to: weekEnd.toDate(),
            items: {
              createMany: {
                data: weeklyTemplate.items.map((item) => ({
                  description: item.name,
                })),
              },
            },
          },
        });
      }
      this.logger.verbose('Single checklist generation complete');
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async addComment(user: User, checklistId: number, comment: string) {
    try {
      const checklist = await this.prisma.checklist.findFirst({
        where: { id: checklistId },
      });
      if (!checklist) {
        throw new BadRequestException('Invalid checklist.');
      }
      await this.prisma.checklistComment.create({
        data: {
          checklistId,
          description: comment,
          userId: user.id,
        },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async addIssue(user: User, checklistId: number, itemId, comment: string) {
    try {
      const checklist = await this.prisma.checklist.findFirst({
        where: { id: checklistId },
      });
      if (!checklist) {
        throw new BadRequestException('Invalid checklist.');
      }
      await this.prisma.checklistComment.create({
        data: {
          checklistId,
          itemId,
          type: 'Issue',
          description: comment,
          userId: user.id,
        },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async removeComment(user: User, id: number) {
    try {
      const comment = await this.prisma.checklistComment.findFirst({
        where: { id },
        select: { userId: true },
      });
      if (comment.userId !== user.id) {
        throw new ForbiddenError("Cannot delete other user's comments.");
      }
      await this.prisma.checklistComment.delete({ where: { id } });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async checklistSummary({
    entityId,
    type,
    from,
    to,
  }: ChecklistSummaryInput): Promise<ChecklistSummary[]> {
    try {
      await this.entityService.findOne(entityId);
      if (type === 'Daily') {
        from = moment(from).startOf('day').toDate();
        to = moment(to).endOf('day').toDate();
      } else {
        from = moment(from).startOf('week').toDate();
        to = moment(to).endOf('week').toDate();
      }
      const where: any = {
        entityId,
        type,
        from: { gte: from },
        to: { lte: to },
      };
      const checklists = await this.prisma.checklist.findMany({
        where,
        include: { items: true, comments: true },
      });
      const summaries: ChecklistSummary[] = [];
      for (const checklist of checklists) {
        const summary = new ChecklistSummary();
        Object.assign(summary, checklist);
        if (checklist.items.length === 0) {
          summary.itemCompletion = 'empty';
        } else if (checklist.items.every((item) => item.completedAt !== null)) {
          summary.itemCompletion = 'all';
        } else if (checklist.items.some((item) => item.completedAt !== null)) {
          summary.itemCompletion = 'some';
        } else {
          summary.itemCompletion = 'none';
        }
        summary.hasComments =
          checklist.comments.filter((c) => c.type === 'Comment').length > 0
            ? true
            : false;
        summary.hasIssues =
          checklist.comments.filter((c) => c.type === 'Issue').length > 0
            ? true
            : false;
        summaries.push(summary);
      }
      return summaries;
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }
}
