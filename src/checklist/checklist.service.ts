import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'nestjs-prisma';
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
import { Entity } from 'src/entity/dto/models/entity.model';
import { IncompleteChecklistInput } from './dto/incomplete-checklist.input';

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
  }

  // Check if old checklist and throw error
  async checkIfOldChecklist(checklistId: number, to?: Date) {
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
  }

  //** Set checklist item as complete or incomplete. */
  async toggleChecklistItem(user: User, id: number, complete: boolean) {
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
  }

  async updateWorkingHours(user: User, id: number, newHrs: number) {
    const checklist = await this.prisma.checklist.findFirst({
      where: { id },
      select: { entityId: true },
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
  }

  async updateReading(user: User, id: number, reading: number) {
    const checklist = await this.prisma.checklist.findFirst({
      where: { id },
      select: { entityId: true },
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
  }

  async incompleteChecklists(
    user: User,
    { date, type }: IncompleteChecklistInput
  ): Promise<Checklist[] | null> {
    const assignments = await this.prisma.entityAssignment.findMany({
      where: {
        removedAt: null,
        userId: user.id,
        type: { in: ['Admin', 'User'] },
      },
    });
    if (assignments.length === 0) return null;
    let from;
    let to;
    if (type === 'Daily') {
      from = moment(date).startOf('day').toDate();
      to = moment(date).endOf('day').toDate();
    } else {
      from = moment(date).startOf('week').toDate();
      to = moment(date).endOf('week').toDate();
    }
    const checklists = await this.prisma.checklist.findMany({
      where: {
        type,
        entityId: { in: assignments.map((a) => a.entityId) },
        from: { gte: from },
        to: { lte: to },
        OR: [
          { items: { some: { completedAt: null } } },
          { currentMeterReading: null, workingHour: null, type: 'Daily' },
        ],
      },
      include: {
        entity: { include: { type: true, location: true } },
        items: true,
        comments: true,
      },
    });
    return checklists;
  }

  async incompleteChecklistSummary(
    user: User,
    { type, from, to }: IncompleteChecklistSummaryInput
  ) {
    const assignments = await this.prisma.entityAssignment.findMany({
      where: {
        removedAt: null,
        userId: user.id,
        type: { in: ['Admin', 'User'] },
      },
    });
    if (assignments.length === 0) return null;
    const start = moment(from);
    const end = moment(to);
    const checklists = await this.prisma.checklist.findMany({
      where: {
        type,
        entityId: { in: assignments.map((a) => a.entityId) },
        from: { gte: start.startOf('day').toDate() },
        to: { lte: end.endOf(type === 'Daily' ? 'day' : 'week').toDate() },
        OR: [
          { items: { some: { completedAt: null } } },
          { currentMeterReading: null, workingHour: null, type: 'Daily' },
        ],
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
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async generateChecklistsCron() {
    this.logger.verbose('Checklist generation cron job started');
    // Temporarily running as direct function call
    // Should be run in the background by a queue instead
    await this.generateChecklists();
  }

  async generateChecklists() {
    // Get ids of all entities that are working
    const entities = await this.prisma.entity.findMany({
      where: { status: 'Working', deletedAt: null },
      select: { id: true },
    });
    const entityIds = entities.map((m) => m.id);

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
    const notGeneratedDailyEntityIds = entityIds.filter(
      (id) => !todayChecklistEntityIds.includes(id)
    );
    for (const entityId of notGeneratedDailyEntityIds) {
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
    const notGeneratedWeeklyEntityIds = entityIds.filter(
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
  }

  async addComment(user: User, checklistId: number, comment: string) {
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
  }

  async addIssue(user: User, checklistId: number, itemId, comment: string) {
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
  }

  async removeComment(user: User, id: number) {
    const comment = await this.prisma.checklistComment.findFirst({
      where: { id },
      select: { userId: true },
    });
    if (comment.userId !== user.id) {
      throw new ForbiddenError("Cannot delete other user's comments.");
    }
    await this.prisma.checklistComment.delete({ where: { id } });
  }

  async checklistSummary({
    entityId,
    type,
    from,
    to,
  }: ChecklistSummaryInput): Promise<ChecklistSummary[]> {
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
  }
}
