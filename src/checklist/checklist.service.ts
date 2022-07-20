import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'nestjs-prisma';
import * as moment from 'moment';
import { ChecklistTemplateService } from 'src/resolvers/checklist-template/checklist-template.service';
import { ChecklistInput } from './dto/checklist.input';
import { Checklist } from '@prisma/client';
import { User } from 'src/models/user.model';

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
          transportationId: entityId,
          from,
          to,
          type,
        },
        include: {
          items: {
            include: { completedBy: true },
            orderBy: { id: 'asc' },
          },
        },
      });
    } else {
      checklist = await this.prisma.checklist.findFirst({
        where: {
          machineId: entityId,
          from,
          to,
          type,
        },
        include: {
          items: {
            include: { completedBy: true },
            orderBy: { id: 'asc' },
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
    todayChecklists.forEach((checklist) => {
      if (checklist.machineId) {
        todayChecklistMachineIds.push(checklist.machineId);
      } else if (checklist.transportationId) {
        todayChecklistTransportationIds.push(checklist.transportationId);
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
    thisWeekChecklists.forEach((checklist) => {
      if (checklist.machineId) {
        thisWeekChecklistMachineIds.push(checklist.machineId);
      } else if (checklist.transportationId) {
        thisWeekTransportationIds.push(checklist.transportationId);
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

    this.logger.verbose('Checklist generation complete');
  }
}
