import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'nestjs-prisma';
import * as moment from 'moment';
import { ChecklistTemplateService } from 'src/resolvers/checklist-template/checklist-template.service';
import { ChecklistInput } from './dto/checklist.input';
import { Checklist } from '@prisma/client';
import { User } from 'src/models/user.model';
import { ChecklistSummaryInput } from './dto/checklist-summary.input';
import { ChecklistSummary } from './dto/checklist-summary';

@Injectable()
export class ChecklistService {
  private readonly logger = new Logger(ChecklistService.name);
  constructor(
    private prisma: PrismaService,
    private checklistTemplateService: ChecklistTemplateService
  ) {}

  async findOne({ entityId, entityType, type, date }: ChecklistInput) {
    await this.checklistTemplateService.validateEntity(entityType, entityId);
    let checklist: null | Checklist = null;
    let from = moment(date).startOf('day').toDate();
    let to = moment(date).endOf('day').toDate();
    if (type === 'Weekly') {
      from = moment(date).startOf('week').toDate();
      to = moment(date).endOf('week').toDate();
    }
    if (entityType === 'Transportation') {
      checklist = await this.prisma.checklist.findFirst({
        where: {
          entityId,
          from,
          to,
          type,
        },
        include: {
          items: {
            include: { completedBy: true },
            orderBy: { id: 'asc' },
          },
          comments: {
            include: {
              user: true,
            },
            orderBy: { id: 'desc' },
          },
        },
      });
    } else {
      checklist = await this.prisma.checklist.findFirst({
        where: {
          entityId,
          from,
          to,
          type,
        },
        include: {
          items: {
            include: { completedBy: true },
            orderBy: { id: 'asc' },
          },
          comments: {
            include: {
              user: true,
            },
            orderBy: { id: 'desc' },
          },
        },
      });
    }
    return checklist;
  }

  //** Set checklist item as complete or incomplete. */
  async toggleChecklistItem(user: User, id: number, complete: boolean) {
    await this.prisma.checklistItem.update({
      where: { id },
      data: complete
        ? { completedById: user.id, completedAt: new Date() }
        : { completedById: null, completedAt: null },
    });
  }

  async updateWorkingHours(id: number, newHrs: number) {
    await this.prisma.checklist.update({
      where: { id },
      data: { workingHour: newHrs },
    });
  }

  async updateReading(id: number, reading: number) {
    await this.prisma.checklist.update({
      where: { id },
      data: { currentMeterReading: reading },
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async generateChecklistsCron() {
    this.logger.verbose('Checklist generation cron job started');
    // Temporarily running as direct function call
    // Should be run in the background by a queue instead
    await this.generateChecklists();
  }

  async generateChecklists() {
    // Get Ids of all machines and transport that are working
    const machines = await this.prisma.machine.findMany({
      where: { status: 'Working' },
      select: { id: true },
    });
    const machineIds = machines.map((m) => m.id);
    const transportations = await this.prisma.transportation.findMany({
      where: { status: 'Working' },
      select: { id: true },
    });
    const transportIds = transportations.map((m) => m.id);
    const entities = await this.prisma.entity.findMany({
      where: { status: 'Working' },
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
    });
    const todayChecklistMachineIds: number[] = [];
    const todayChecklistTransportationIds: number[] = [];
    const todayChecklistEntityIds: number[] = [];
    todayChecklists.forEach((checklist) => {
      if (checklist.machineId) {
        todayChecklistMachineIds.push(checklist.machineId);
      } else if (checklist.transportationId) {
        todayChecklistTransportationIds.push(checklist.transportationId);
      } else if (checklist.entityId) {
        todayChecklistEntityIds.push(checklist.entityId);
      }
    });

    // Create daily checklists for machines
    const notGeneratedDailyMachineIds = machineIds.filter(
      (id) => !todayChecklistMachineIds.includes(id)
    );
    for (const machineId of notGeneratedDailyMachineIds) {
      const dailyTemplate =
        await this.checklistTemplateService.entityChecklistTemplate({
          entityType: 'Machine',
          entityId: machineId,
          type: 'Daily',
        });
      await this.prisma.checklist.create({
        data: {
          type: 'Daily',
          machineId,
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

    // Create daily checklists for transportation
    const notGeneratedDailyTransportationIds = transportIds.filter(
      (id) => !todayChecklistTransportationIds.includes(id)
    );
    for (const transportationId of notGeneratedDailyTransportationIds) {
      const dailyTemplate =
        await this.checklistTemplateService.entityChecklistTemplate({
          entityType: 'Transportation',
          entityId: transportationId,
          type: 'Daily',
        });
      await this.prisma.checklist.create({
        data: {
          type: 'Daily',
          transportationId,
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

    // Create daily checklists for entity
    const notGeneratedDailyEntityIds = entityIds.filter(
      (id) => !todayChecklistEntityIds.includes(id)
    );
    for (const entityId of notGeneratedDailyEntityIds) {
      const dailyTemplate =
        await this.checklistTemplateService.entityChecklistTemplate({
          entityType: 'Machine',
          entityId: entityId,
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
      const dailyTemplateTwo =
        await this.checklistTemplateService.entityChecklistTemplate({
          entityType: 'Transportation',
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
              data: dailyTemplateTwo.items.map((item) => ({
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
    });
    const thisWeekChecklistMachineIds: number[] = [];
    const thisWeekTransportationIds: number[] = [];
    const thisWeekEntityIds: number[] = [];
    thisWeekChecklists.forEach((checklist) => {
      if (checklist.machineId) {
        thisWeekChecklistMachineIds.push(checklist.machineId);
      } else if (checklist.transportationId) {
        thisWeekTransportationIds.push(checklist.transportationId);
      } else if (checklist.entityId) {
        thisWeekEntityIds.push(checklist.entityId);
      }
    });

    // Create weekly checklists for machines
    const notGeneratedWeeklyMachineIds = machineIds.filter(
      (id) => !thisWeekChecklistMachineIds.includes(id)
    );
    for (const machineId of notGeneratedWeeklyMachineIds) {
      const weeklyTemplate =
        await this.checklistTemplateService.entityChecklistTemplate({
          entityType: 'Machine',
          entityId: machineId,
          type: 'Weekly',
        });
      await this.prisma.checklist.create({
        data: {
          type: 'Weekly',
          machineId,
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

    // Create weekly checklists for transportation
    const notGeneratedWeeklyTransportationIds = transportIds.filter(
      (id) => !thisWeekTransportationIds.includes(id)
    );
    for (const transportationId of notGeneratedWeeklyTransportationIds) {
      const weeklyTemplate =
        await this.checklistTemplateService.entityChecklistTemplate({
          entityType: 'Transportation',
          entityId: transportationId,
          type: 'Weekly',
        });
      await this.prisma.checklist.create({
        data: {
          type: 'Weekly',
          transportationId,
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

    // Create weekly checklists for entity
    const notGeneratedWeeklyEntityIds = entityIds.filter(
      (id) => !thisWeekEntityIds.includes(id)
    );
    for (const entityId of notGeneratedWeeklyEntityIds) {
      const weeklyTemplate =
        await this.checklistTemplateService.entityChecklistTemplate({
          entityType: 'Machine',
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
      const weeklyTemplateTwo =
        await this.checklistTemplateService.entityChecklistTemplate({
          entityType: 'Transportation',
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
              data: weeklyTemplateTwo.items.map((item) => ({
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

  async removeComment(id: number) {
    await this.prisma.checklistComment.delete({ where: { id } });
  }

  async checklistSummary({
    entityId,
    entityType,
    type,
    from,
    to,
  }: ChecklistSummaryInput): Promise<ChecklistSummary[]> {
    await this.checklistTemplateService.validateEntity(entityType, entityId);
    if (type === 'Daily') {
      from = moment(from).startOf('day').toDate();
      to = moment(to).endOf('day').toDate();
    } else {
      from = moment(from).startOf('week').toDate();
      to = moment(to).endOf('week').toDate();
    }
    let where: any = {
      type,
      from: { gte: from },
      to: { lte: to },
    };
    if (entityType === 'Transportation') {
      where.entityId = entityId;
    } else {
      where.entityId = entityId;
    }
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
      summary.hasComments = checklist.comments.length > 0 ? true : false;
      summaries.push(summary);
    }
    return summaries;
  }
}
