import { PrismaService } from 'nestjs-prisma';
import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { RedisCacheService } from 'src/redisCache.service';
import ConnectionArgs, {
  connectionFromArraySlice,
  getPagingParameters,
} from 'src/common/pagination/connection-args';
import { UserService } from './user.service';
import { NotificationService } from './notification.service';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { PUB_SUB } from 'src/resolvers/pubsub/pubsub.module';
import { ConfigService } from '@nestjs/config';
import { PaginatedTransportation } from 'src/models/pagination/transportation-connection.model';
import { TransportationConnectionArgs } from 'src/models/args/transportation-connection.args';
import { PeriodicMaintenanceStatus } from 'src/common/enums/periodicMaintenanceStatus';
import { RepairStatus } from 'src/common/enums/repairStatus';
import { SparePRStatus } from 'src/common/enums/sparePRStatus';
import { BreakdownStatus } from 'src/common/enums/breakdownStatus';
import { TransportationBreakdownConnectionArgs } from 'src/models/args/transportation-breakdown-connection.args';
import { PaginatedTransportationBreakdown } from 'src/models/pagination/transportation-breakdown-connection.model';
import { TransportationRepairConnectionArgs } from 'src/models/args/transportation-repair-connection.args';
import { PaginatedTransportationRepair } from 'src/models/pagination/transportation-repair-connection.model';
import { TransportationSparePRConnectionArgs } from 'src/models/args/transportation-sparePR-connection.args';
import { PaginatedTransportationSparePR } from 'src/models/pagination/transportation-sparePR-connection.model';
import { TransportationPeriodicMaintenanceConnectionArgs } from 'src/models/args/transportation-periodic-maintenance-connection.args';
import { PaginatedTransportationPeriodicMaintenance } from 'src/models/pagination/transportation-periodic-maintenance-connection.model';
import { PaginatedTransportationHistory } from 'src/models/pagination/transportation-history-connection.model';
import { TransportationHistoryConnectionArgs } from 'src/models/args/transportation-history-connection.args';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import * as moment from 'moment';
import { TransportationStatus } from 'src/common/enums/transportationStatus';
import { Transportation } from 'src/models/transportation.model';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PaginatedTransportationPeriodicMaintenanceTask } from 'src/models/pagination/transportation-pm-tasks-connection.model';
import { ChecklistTemplateService } from 'src/resolvers/checklist-template/checklist-template.service';

export interface TransportationHistoryInterface {
  transportationId: number;
  type: string;
  description: string;
  completedById?: number;
  workingHour?: number;
  idleHour?: number;
  breakdownHour?: number;
  transportationStatus?: TransportationStatus;
}

@Injectable()
export class TransportationService {
  constructor(
    private prisma: PrismaService,
    private userService: UserService,
    private readonly redisCacheService: RedisCacheService,
    private readonly notificationService: NotificationService,
    @InjectQueue('cmms-transportation-history')
    private transportationHistoryQueue: Queue,
    @Inject(PUB_SUB) private readonly pubSub: RedisPubSub,
    private configService: ConfigService,
    private readonly checklistTemplateService: ChecklistTemplateService
  ) {}

  //** Create transportation. */
  async createTransportation(
    user: User,
    machineNumber: string,
    model: string,
    type: string,
    location: string,
    department: string,
    engine: string,
    measurement: string,
    currentMileage: number,
    lastServiceMileage: number,
    transportType: string,
    registeredDate: Date
  ) {
    try {
      const newDailyTemplate = await this.prisma.checklistTemplate.create({
        data: { type: 'Daily' },
        include: { items: true },
      });
      const newWeeklyTemplate = await this.prisma.checklistTemplate.create({
        data: { type: 'Weekly' },
        include: { items: true },
      });
      const transportation = await this.prisma.transportation.create({
        data: {
          createdById: user.id,
          machineNumber,
          model,
          type,
          location,
          department,
          engine,
          measurement,
          currentMileage,
          lastServiceMileage,
          transportType,
          registeredDate,
          dailyChecklistTemplateId: newDailyTemplate.id,
          weeklyChecklistTemplateId: newWeeklyTemplate.id,
        },
      });
      await this.checklistTemplateService.updateEntityChecklists(
        transportation.id,
        'Transportation',
        'Daily',
        newDailyTemplate
      );
      await this.checklistTemplateService.updateEntityChecklists(
        transportation.id,
        'Transportation',
        'Weekly',
        newWeeklyTemplate
      );
      await this.createTransportationHistoryInBackground({
        type: 'Transportation Add',
        description: `Transportation created`,
        transportationId: transportation.id,
        completedById: user.id,
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Delete transportation. */
  async deleteTransportation(id: number, user: User) {
    try {
      const transportationUsers = await this.getTransportationUserIds(
        id,
        user.id
      );
      for (let index = 0; index < transportationUsers.length; index++) {
        await this.notificationService.createInBackground({
          userId: transportationUsers[index],
          body: `${user.fullName} (${user.rcno}) deleted transportation (${id})}`,
          link: `/transportation/${id}`,
        });
      }
      await this.prisma.transportation.update({
        where: { id },
        data: {
          isDeleted: true,
          deletedById: user.id,
          deletedAt: new Date(),
        },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Edit Transportation */
  async editTransportation(
    user: User,
    id: number,
    machineNumber: string,
    model: string,
    type: string,
    location: string,
    department: string,
    engine: string,
    measurement: string,
    lastServiceMileage: number,
    transportType: string,
    registeredDate: Date,
    currentMileage?: number
  ) {
    try {
      const transportation = await this.prisma.transportation.findFirst({
        where: { id },
      });
      if (transportation.machineNumber != machineNumber) {
        await this.createTransportationHistoryInBackground({
          type: 'Transportation Edit',
          description: `Machine number changed from ${transportation.machineNumber} to ${machineNumber}.`,
          transportationId: id,
          completedById: user.id,
        });
      }
      if (transportation.model != model) {
        await this.createTransportationHistoryInBackground({
          type: 'Transportation Edit',
          description: `Model changed from ${transportation.model} to ${model}.`,
          transportationId: id,
          completedById: user.id,
        });
      }
      if (transportation.type != type) {
        await this.createTransportationHistoryInBackground({
          type: 'Transportation Edit',
          description: `Type changed from ${transportation.type} to ${type}.`,
          transportationId: id,
          completedById: user.id,
        });
      }
      if (transportation.department != department) {
        await this.createTransportationHistoryInBackground({
          type: 'Transportation Edit',
          description: `Department changed from ${transportation.department} to ${department}.`,
          transportationId: id,
          completedById: user.id,
        });
      }
      if (transportation.location != location) {
        await this.createTransportationHistoryInBackground({
          type: 'Transportation Edit',
          description: `Location changed from ${transportation.location} to ${location}.`,
          transportationId: id,
          completedById: user.id,
        });
      }
      if (transportation.currentMileage != currentMileage) {
        await this.createTransportationHistoryInBackground({
          type: 'Transportation Edit',
          description: `Current Mileage changed from ${transportation.currentMileage} to ${currentMileage}.`,
          transportationId: id,
          completedById: user.id,
        });
      }
      if (transportation.lastServiceMileage != lastServiceMileage) {
        await this.createTransportationHistoryInBackground({
          type: 'Transportation Edit',
          description: `Last Service Mileage changed from ${transportation.lastServiceMileage} to ${lastServiceMileage}.`,
          transportationId: id,
          completedById: user.id,
        });
      }
      if (transportation.engine != engine) {
        await this.createTransportationHistoryInBackground({
          type: 'Transportation Edit',
          description: `Engine changed from ${transportation.engine} to ${engine}.`,
          transportationId: id,
          completedById: user.id,
        });
      }
      if (transportation.measurement != engine) {
        await this.createTransportationHistoryInBackground({
          type: 'Transportation Edit',
          description: `Measurement changed from ${transportation.measurement} to ${measurement}.`,
          transportationId: id,
          completedById: user.id,
        });
      }
      if (transportation.transportType != transportType) {
        await this.createTransportationHistoryInBackground({
          type: 'Transportation Edit',
          description: `Transport Type changed from ${transportation.transportType} to ${transportType}.`,
          transportationId: id,
          completedById: user.id,
        });
      }
      if (
        moment(transportation.registeredDate).format('DD MMMM YYYY HH:mm:ss') !=
        moment(registeredDate).format('DD MMMM YYYY HH:mm:ss')
      ) {
        await this.createTransportationHistoryInBackground({
          type: 'Transportation Edit',
          description: `Registered date changed from ${moment(
            transportation.registeredDate
          ).format('DD MMMM YYYY')} to ${moment(registeredDate).format(
            'DD MMMM YYYY'
          )}.`,
          transportationId: id,
          completedById: user.id,
        });
      }

      const transportationUsers = await this.getTransportationUserIds(
        id,
        user.id
      );
      for (let index = 0; index < transportationUsers.length; index++) {
        await this.notificationService.createInBackground({
          userId: transportationUsers[index],
          body: `${user.fullName} (${user.rcno}) edited transportation (${id})}`,
          link: `/transportation/${id}`,
        });
      }

      await this.prisma.transportation.update({
        data: {
          machineNumber,
          model,
          type,
          location,
          department,
          engine,
          measurement,
          currentMileage,
          lastServiceMileage,
          transportType,
          registeredDate,
        },
        where: { id },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Set transportation status. */
  async setTransportationStatus(
    user: User,
    transportationId: number,
    status: TransportationStatus
  ) {
    try {
      if (status === 'Working') {
        await this.prisma.transportationBreakdown.updateMany({
          where: { transportationId },
          data: { status: 'Done' },
        });
        await this.prisma.transportationRepair.updateMany({
          where: { transportationId },
          data: { status: 'Done' },
        });
      }
      await this.prisma.transportation.update({
        where: { id: transportationId },
        data: { status, statusChangedAt: new Date() },
      });
      await this.createTransportationHistoryInBackground({
        type: 'Transportation Status Change',
        description: `(${transportationId}) Set status to ${status}`,
        transportationId: transportationId,
        completedById: user.id,
      });
      const transportationUsers = await this.getTransportationUserIds(
        transportationId,
        user.id
      );
      for (let index = 0; index < transportationUsers.length; index++) {
        await this.notificationService.createInBackground({
          userId: transportationUsers[index],
          body: `${user.fullName} (${user.rcno}) set status to ${status} on transportation ${transportationId}`,
          link: `/transportation/${transportationId}`,
        });
      }
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  // Get transportation details
  async getSingleTransportation(user: User, transportationId: number) {
    const transportation = await this.prisma.transportation.findFirst({
      where: { id: transportationId },
      include: {
        createdBy: true,
        dailyChecklistTemplate: {
          include: {
            items: true,
          },
        },
        weeklyChecklistTemplate: {
          include: {
            items: true,
          },
        },
        assignees: { include: { user: true } },
      },
    });
    if (!transportation)
      throw new BadRequestException('Transportation not found.');
    const latestDailyChecklist = await this.prisma.checklist.findFirst({
      where: {
        transportationId: transportation.id,
        type: 'Daily',
        currentMeterReading: { not: null },
      },
      orderBy: { from: 'desc' },
    });
    if (latestDailyChecklist) {
      transportation.currentMileage = latestDailyChecklist.currentMeterReading;
    }
    return transportation;
  }

  //** Get transportation. Results are paginated. User cursor argument to go forward/backward. */
  async getTransportationWithPagination(
    user: User,
    args: TransportationConnectionArgs
  ): Promise<PaginatedTransportation> {
    const { limit, offset } = getPagingParameters(args);
    const limitPlusOne = limit + 1;
    const {
      createdById,
      search,
      assignedToId,
      transportType,
      status,
      location,
    } = args;

    // eslint-disable-next-line prefer-const
    let where: any = { AND: [] };
    if (createdById) {
      where.AND.push({ createdById });
    }
    if (assignedToId) {
      where.AND.push({
        assignees: { some: { userId: assignedToId } },
      });
    }

    if (transportType) {
      where.AND.push({
        transportType,
      });
    }

    if (status) {
      where.AND.push({ status });
    }

    if (location.length > 0) {
      where.AND.push({
        location: {
          in: location,
        },
      });
    }

    if (search) {
      const or: any = [
        { model: { contains: search, mode: 'insensitive' } },
        { machineNumber: { contains: search, mode: 'insensitive' } },
      ];
      // If search contains all numbers, search the machine ids as well
      if (/^(0|[1-9]\d*)$/.test(search)) {
        or.push({ id: parseInt(search) });
      }
      where.AND.push({
        OR: or,
      });
    }
    const transportation = await this.prisma.transportation.findMany({
      skip: offset,
      take: limitPlusOne,
      where,
      include: {
        createdBy: true,
        sparePRs: { orderBy: { id: 'desc' } },
        breakdowns: { orderBy: { id: 'desc' } },
      },
    });

    const count = await this.prisma.transportation.count({ where });
    const { edges, pageInfo } = connectionFromArraySlice(
      transportation.slice(0, limit),
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

  //** Create transport periodic maintenance. */
  async createTransportationPeriodicMaintenance(
    user: User,
    transportationId: number,
    title: string,
    measurement: string,
    value: number,
    startDate: Date,
    tasks: string[]
  ) {
    try {
      const periodicMaintenance =
        await this.prisma.transportationPeriodicMaintenance.create({
          data: {
            transportationId,
            title,
            measurement,
            value,
            startDate,
          },
        });
      await this.prisma.transportationPeriodicMaintenanceTask.createMany({
        data: tasks.map((task) => ({
          periodicMaintenanceId: periodicMaintenance.id,
          name: task,
        })),
      });
      await this.createTransportationHistoryInBackground({
        type: 'Add Periodic Maintenance',
        description: `Added periodic maintenance (${periodicMaintenance.id})`,
        transportationId: transportationId,
        completedById: user.id,
      });
      const transportationUsers = await this.getTransportationUserIds(
        periodicMaintenance.transportationId,
        user.id
      );
      for (let index = 0; index < transportationUsers.length; index++) {
        await this.notificationService.createInBackground({
          userId: transportationUsers[index],
          body: `${user.fullName} (${user.rcno}) added new periodic maintenance on transportation ${transportationId}`,
          link: `/transportation/${transportationId}`,
        });
      }
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Edit transport periodic maintenance. */
  async editTransportationPeriodicMaintenance(
    user: User,
    id: number,
    title: string,
    measurement: string,
    value: number,
    startDate: Date,
    tasks: string[]
  ) {
    try {
      const periodicMaintenance =
        await this.prisma.transportationPeriodicMaintenance.findFirst({
          where: { id },
          select: {
            id: true,
            transportationId: true,
            title: true,
            measurement: true,
            startDate: true,
            value: true,
          },
        });
      if (periodicMaintenance.title != title) {
        await this.createTransportationHistoryInBackground({
          type: 'Periodic Maintenance Edit',
          description: `(${id}) Title changed from ${periodicMaintenance.title} to ${title}.`,
          transportationId: periodicMaintenance.transportationId,
          completedById: user.id,
        });
      }
      if (periodicMaintenance.measurement != measurement) {
        await this.createTransportationHistoryInBackground({
          type: 'Periodic Maintenance Edit',
          description: `(${id}) Measurement changed from ${periodicMaintenance.measurement} to ${measurement}.`,
          transportationId: periodicMaintenance.transportationId,
          completedById: user.id,
        });
      }
      if (periodicMaintenance.value != value) {
        await this.createTransportationHistoryInBackground({
          type: 'Periodic Maintenance Edit',
          description: `(${id}) Value changed from ${periodicMaintenance.value} to ${value}.`,
          transportationId: periodicMaintenance.transportationId,
          completedById: user.id,
        });
      }
      if (
        moment(periodicMaintenance.startDate).format('DD MMMM YYYY HH:mm:ss') !=
        moment(startDate).format('DD MMMM YYYY HH:mm:ss')
      ) {
        await this.createTransportationHistoryInBackground({
          type: 'Periodic Maintenance Edit',
          description: `(${id}) Start date changed from ${periodicMaintenance.startDate} to ${startDate}.`,
          transportationId: periodicMaintenance.transportationId,
          completedById: user.id,
        });
      }
      const transportationUsers = await this.getTransportationUserIds(
        periodicMaintenance.transportationId,
        user.id
      );
      for (let index = 0; index < transportationUsers.length; index++) {
        await this.notificationService.createInBackground({
          userId: transportationUsers[index],
          body: `${user.fullName} (${user.rcno}) edited periodic transportation (${periodicMaintenance.id}) on transportation ${periodicMaintenance.transportationId}`,
          link: `/transportation/${periodicMaintenance.transportationId}`,
        });
      }
      await this.prisma.transportationPeriodicMaintenance.update({
        where: { id },
        data: {
          title,
          measurement,
          value,
          startDate,
        },
      });
      await this.prisma.transportationPeriodicMaintenanceTask.createMany({
        data: tasks.map((task) => ({
          periodicMaintenanceId: periodicMaintenance.id,
          name: task,
        })),
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Delete transport periodic maintenance. */
  async deleteTransportationPeriodicMaintenance(user: User, id: number) {
    try {
      const periodicMaintenance =
        await this.prisma.transportationPeriodicMaintenance.findFirst({
          where: { id },
          select: {
            id: true,
            transportationId: true,
            title: true,
          },
        });

      const transportationUsers = await this.getTransportationUserIds(
        periodicMaintenance.transportationId,
        user.id
      );
      for (let index = 0; index < transportationUsers.length; index++) {
        await this.notificationService.createInBackground({
          userId: transportationUsers[index],
          body: `${user.fullName} (${user.rcno}) deleted periodic maintenance (${periodicMaintenance.id}) on transportation ${periodicMaintenance.transportationId}`,
          link: `/transportation/${periodicMaintenance.transportationId}`,
        });
      }
      await this.createTransportationHistoryInBackground({
        type: 'Periodic Maintenance Delete',
        description: `(${id}) Periodic Maintenance (${periodicMaintenance.title}) deleted.`,
        transportationId: periodicMaintenance.transportationId,
        completedById: user.id,
      });
      await this.prisma.transportationPeriodicMaintenance.delete({
        where: { id },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Set transport periodic maintenance status. */
  async setTransportationPeriodicMaintenanceStatus(
    user: User,
    id: number,
    status: PeriodicMaintenanceStatus
  ) {
    try {
      let completedFlag = false;
      const periodicMaintenance =
        await this.prisma.transportationPeriodicMaintenance.findFirst({
          where: { id },
          select: {
            transportationId: true,
          },
        });
      if (status == 'Done') {
        completedFlag = true;
        await this.createTransportationHistoryInBackground({
          type: 'Periodic Maintenance Status',
          description: `(${id}) Set status to ${status}.`,
          transportationId: periodicMaintenance.transportationId,
          completedById: user.id,
        });
      }
      if (status == 'Pending') {
        await this.createTransportationHistoryInBackground({
          type: 'Periodic Maintenance Status',
          description: `(${id}) Set status to ${status}.`,
          transportationId: periodicMaintenance.transportationId,
          completedById: user.id,
        });
      }
      if (status == 'Missed') {
        await this.createTransportationHistoryInBackground({
          type: 'Periodic Maintenance Status',
          description: `(${id}) Set status to ${status}.`,
          transportationId: periodicMaintenance.transportationId,
          completedById: user.id,
        });
      }
      const transportationUsers = await this.getTransportationUserIds(
        periodicMaintenance.transportationId,
        user.id
      );
      for (let index = 0; index < transportationUsers.length; index++) {
        await this.notificationService.createInBackground({
          userId: transportationUsers[index],
          body: `${user.fullName} (${user.rcno}) set periodic maintenance status to (${status}) on transportation ${periodicMaintenance.transportationId}`,
          link: `/transportation/${periodicMaintenance.transportationId}`,
        });
      }
      await this.prisma.transportationPeriodicMaintenance.update({
        where: { id },
        data: completedFlag
          ? { completedById: user.id, completedAt: new Date(), status }
          : { completedById: null, completedAt: null, status },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Create transportation repair. */
  async createTransportationRepair(
    user: User,
    transportationId: number,
    title: string,
    description: string
  ) {
    try {
      const repair = await this.prisma.transportationRepair.create({
        data: {
          transportationId,
          title,
          description,
        },
      });
      await this.createTransportationHistoryInBackground({
        type: 'Add Repair',
        description: `Added repair (${repair.id})`,
        transportationId: transportationId,
        completedById: user.id,
      });
      const transportationUsers = await this.getTransportationUserIds(
        transportationId,
        user.id
      );
      for (let index = 0; index < transportationUsers.length; index++) {
        await this.notificationService.createInBackground({
          userId: transportationUsers[index],
          body: `${user.fullName} (${user.rcno}) added new repair on transportation ${transportationId}`,
          link: `/transportation/${transportationId}`,
        });
      }
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Edit transportation repair. */
  async editTransportationRepair(
    user: User,
    id: number,
    title: string,
    description: string
  ) {
    try {
      const repair = await this.prisma.transportationRepair.findFirst({
        where: { id },
        select: {
          id: true,
          transportationId: true,
          title: true,
          description: true,
        },
      });
      if (repair.title != title) {
        await this.createTransportationHistoryInBackground({
          type: 'Repair Edit',
          description: `(${id}) Title changed from ${repair.title} to ${title}.`,
          transportationId: repair.transportationId,
          completedById: user.id,
        });
      }
      if (repair.description != description) {
        await this.createTransportationHistoryInBackground({
          type: 'Repair Edit',
          description: `(${id}) Description changed from ${repair.description} to ${description}.`,
          transportationId: repair.transportationId,
          completedById: user.id,
        });
      }
      const transportationUsers = await this.getTransportationUserIds(
        repair.transportationId,
        user.id
      );
      for (let index = 0; index < transportationUsers.length; index++) {
        await this.notificationService.createInBackground({
          userId: transportationUsers[index],
          body: `${user.fullName} (${user.rcno}) edited repair (${repair.id}) on transportation ${repair.transportationId}`,
          link: `/transportation/${repair.transportationId}`,
        });
      }
      await this.prisma.transportationRepair.update({
        where: { id },
        data: { title, description },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Delete transportation repair. */
  async deleteTransportationRepair(user: User, id: number) {
    try {
      const repair = await this.prisma.transportationRepair.findFirst({
        where: { id },
        select: {
          id: true,
          transportationId: true,
          title: true,
        },
      });
      await this.createTransportationHistoryInBackground({
        type: 'Repair Delete',
        description: `(${id}) Repair (${repair.title}) deleted.`,
        transportationId: repair.transportationId,
        completedById: user.id,
      });
      const transportationUsers = await this.getTransportationUserIds(
        repair.transportationId,
        user.id
      );
      for (let index = 0; index < transportationUsers.length; index++) {
        await this.notificationService.createInBackground({
          userId: transportationUsers[index],
          body: `${user.fullName} (${user.rcno}) deleted repair (${repair.id}) on transportation ${repair.transportationId}`,
          link: `/transportation/${repair.transportationId}`,
        });
      }
      await this.prisma.transportationRepair.delete({
        where: { id },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Set transportation repair status. */
  async setTransportationRepairStatus(
    user: User,
    id: number,
    status: RepairStatus
  ) {
    try {
      let completedFlag = false;
      const repair = await this.prisma.transportationRepair.findFirst({
        where: { id },
        select: {
          transportationId: true,
        },
      });
      if (status == 'Done') {
        completedFlag = true;
        await this.createTransportationHistoryInBackground({
          type: 'Repair Status',
          description: `(${id}) Set status to ${status}.`,
          transportationId: repair.transportationId,
          completedById: user.id,
        });
      }
      if (status == 'Pending') {
        await this.createTransportationHistoryInBackground({
          type: 'Repair Status',
          description: `(${id}) Set status to ${status}.`,
          transportationId: repair.transportationId,
          completedById: user.id,
        });
      }
      const transportationUsers = await this.getTransportationUserIds(
        repair.transportationId,
        user.id
      );
      for (let index = 0; index < transportationUsers.length; index++) {
        await this.notificationService.createInBackground({
          userId: transportationUsers[index],
          body: `${user.fullName} (${user.rcno}) set repair status to (${status}) on transportation ${repair.transportationId}`,
          link: `/transportation/${repair.transportationId}`,
        });
      }
      await this.prisma.transportationRepair.update({
        where: { id },
        data: completedFlag
          ? { completedById: user.id, completedAt: new Date(), status }
          : { completedById: null, completedAt: null, status },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Create transportation spare PR. */
  async createTransportationSparePR(
    user: User,
    transportationId: number,
    requestedDate: Date,
    title: string,
    description: string
  ) {
    try {
      const sparePR = await this.prisma.transportationSparePR.create({
        data: {
          transportationId,
          requestedDate,
          title,
          description,
        },
      });
      await this.createTransportationHistoryInBackground({
        type: 'Add Spare PR',
        description: `Added spare PR (${sparePR.id})`,
        transportationId: transportationId,
        completedById: user.id,
      });
      const transportationUsers = await this.getTransportationUserIds(
        transportationId,
        user.id
      );
      for (let index = 0; index < transportationUsers.length; index++) {
        await this.notificationService.createInBackground({
          userId: transportationUsers[index],
          body: `${user.fullName} (${user.rcno}) added new spare PR on transportation ${transportationId}`,
          link: `/transportation/${sparePR.transportationId}`,
        });
      }
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Edit transportation spare pr. */
  async editTransportationSparePR(
    user: User,
    id: number,
    requestedDate: Date,
    title: string,
    description: string
  ) {
    try {
      const sparePR = await this.prisma.transportationSparePR.findFirst({
        where: { id },
        select: {
          id: true,
          transportationId: true,
          title: true,
          description: true,
          requestedDate: true,
        },
      });
      if (sparePR.title != title) {
        await this.createTransportationHistoryInBackground({
          type: 'Spare PR Edit',
          description: `(${id}) Title changed from ${sparePR.title} to ${title}.`,
          transportationId: sparePR.transportationId,
          completedById: user.id,
        });
      }
      if (sparePR.description != description) {
        await this.createTransportationHistoryInBackground({
          type: 'Spare PR Edit',
          description: `(${id}) Description changed from ${sparePR.description} to ${description}.`,
          transportationId: sparePR.transportationId,
          completedById: user.id,
        });
      }
      if (
        moment(sparePR.requestedDate).format('DD MMMM YYYY HH:mm:ss') !=
        moment(requestedDate).format('DD MMMM YYYY HH:mm:ss')
      ) {
        await this.createTransportationHistoryInBackground({
          type: 'Spare PR Edit',
          description: `Requested date changed from ${moment(
            sparePR.requestedDate
          ).format('DD MMMM YYYY')} to ${moment(requestedDate).format(
            'DD MMMM YYYY'
          )}.`,
          transportationId: sparePR.transportationId,
          completedById: user.id,
        });
      }
      const transportationUsers = await this.getTransportationUserIds(
        sparePR.transportationId,
        user.id
      );
      for (let index = 0; index < transportationUsers.length; index++) {
        await this.notificationService.createInBackground({
          userId: transportationUsers[index],
          body: `${user.fullName} (${user.rcno}) edited spare PR (${sparePR.id}) on transportation ${sparePR.transportationId}`,
          link: `/transportation/${sparePR.transportationId}`,
        });
      }
      await this.prisma.transportationSparePR.update({
        where: { id },
        data: { requestedDate, title, description },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Delete transportation spare pr. */
  async deleteTransportationSparePR(user: User, id: number) {
    try {
      const sparePR = await this.prisma.transportationSparePR.findFirst({
        where: { id },
        select: {
          id: true,
          transportationId: true,
          title: true,
        },
      });
      await this.createTransportationHistoryInBackground({
        type: 'Spare PR Delete',
        description: `(${id}) Spare PR (${sparePR.title}) deleted.`,
        transportationId: sparePR.transportationId,
        completedById: user.id,
      });
      const transportationUsers = await this.getTransportationUserIds(
        sparePR.transportationId,
        user.id
      );
      for (let index = 0; index < transportationUsers.length; index++) {
        await this.notificationService.createInBackground({
          userId: transportationUsers[index],
          body: `${user.fullName} (${user.rcno}) deleted spare PR (${sparePR.id}) on transportation ${sparePR.transportationId}`,
          link: `/transportation/${sparePR.transportationId}`,
        });
      }
      await this.prisma.transportationSparePR.delete({
        where: { id },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Set transportation spare pr status. */
  async setTransportationSparePRStatus(
    user: User,
    id: number,
    status: SparePRStatus
  ) {
    try {
      let completedFlag = false;
      const sparePR = await this.prisma.transportationSparePR.findFirst({
        where: { id },
        select: {
          transportationId: true,
        },
      });
      if (status == 'Done') {
        completedFlag = true;
        await this.createTransportationHistoryInBackground({
          type: 'Spare PR Status',
          description: `(${id}) Set status to ${status}.`,
          transportationId: sparePR.transportationId,
          completedById: user.id,
        });
      }
      if (status == 'Pending') {
        await this.createTransportationHistoryInBackground({
          type: 'Spare PR Status',
          description: `(${id}) Set status to ${status}.`,
          transportationId: sparePR.transportationId,
          completedById: user.id,
        });
      }
      const transportationUsers = await this.getTransportationUserIds(
        sparePR.transportationId,
        user.id
      );
      for (let index = 0; index < transportationUsers.length; index++) {
        await this.notificationService.createInBackground({
          userId: transportationUsers[index],
          body: `${user.fullName} (${user.rcno}) set spare PR status to (${status}) on transportation ${sparePR.transportationId}`,
          link: `/transportation/${sparePR.transportationId}`,
        });
      }
      await this.prisma.transportationSparePR.update({
        where: { id },
        data: completedFlag
          ? { completedById: user.id, completedAt: new Date(), status }
          : { completedById: null, completedAt: null, status },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Create transportation breakdown. */
  async createTransportationBreakdown(
    user: User,
    transportationId: number,
    title: string,
    description: string
  ) {
    try {
      const breakdown = await this.prisma.transportationBreakdown.create({
        data: {
          transportationId,
          title,
          description,
        },
      });
      await this.prisma.transportation.update({
        where: { id: transportationId },
        data: { status: 'Breakdown' },
      });
      await this.createTransportationHistoryInBackground({
        type: 'Add Breakdown',
        description: `Added breakdown (${breakdown.id})`,
        transportationId: transportationId,
        completedById: user.id,
      });
      const transportationUsers = await this.getTransportationUserIds(
        transportationId,
        user.id
      );
      for (let index = 0; index < transportationUsers.length; index++) {
        await this.notificationService.createInBackground({
          userId: transportationUsers[index],
          body: `${user.fullName} (${user.rcno}) added new breakdown on transportation ${transportationId}`,
          link: `/transportation/${transportationId}`,
        });
      }
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Edit transportation breakdown. */
  async editTransportationBreakdown(
    user: User,
    id: number,
    title: string,
    description: string,
    estimatedDateOfRepair: Date
  ) {
    try {
      const breakdown = await this.prisma.transportationBreakdown.findFirst({
        where: { id },
        select: {
          id: true,
          transportationId: true,
          title: true,
          description: true,
          estimatedDateOfRepair: true,
        },
      });
      if (breakdown.title != title) {
        await this.createTransportationHistoryInBackground({
          type: 'Breakdown Edit',
          description: `(${id}) Title changed from ${breakdown.title} to ${title}.`,
          transportationId: breakdown.transportationId,
          completedById: user.id,
        });
      }
      if (breakdown.description != description) {
        await this.createTransportationHistoryInBackground({
          type: 'Breakdown Edit',
          description: `(${id}) Description changed from ${breakdown.description} to ${description}.`,
          transportationId: breakdown.transportationId,
          completedById: user.id,
        });
      }
      if (
        moment(breakdown.estimatedDateOfRepair).format(
          'DD MMMM YYYY HH:mm:ss'
        ) != moment(estimatedDateOfRepair).format('DD MMMM YYYY HH:mm:ss')
      ) {
        await this.createTransportationHistoryInBackground({
          type: 'Breakdown Edit',
          description: `Estimated date of repair changed from ${moment(
            breakdown.estimatedDateOfRepair
          ).format('DD MMMM YYYY')} to ${moment(estimatedDateOfRepair).format(
            'DD MMMM YYYY'
          )}.`,
          transportationId: id,
          completedById: user.id,
        });
      }
      const transportationUsers = await this.getTransportationUserIds(
        breakdown.transportationId,
        user.id
      );
      for (let index = 0; index < transportationUsers.length; index++) {
        await this.notificationService.createInBackground({
          userId: transportationUsers[index],
          body: `${user.fullName} (${user.rcno}) edited breakdown (${breakdown.id}) on transportation ${breakdown.transportationId}`,
          link: `/transportation/${breakdown.transportationId}`,
        });
      }
      await this.prisma.transportationBreakdown.update({
        where: { id },
        data: { title, description, estimatedDateOfRepair },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Delete transportation breakdown. */
  async deleteTransportationBreakdown(user: User, id: number) {
    try {
      const breakdown = await this.prisma.transportationBreakdown.findFirst({
        where: { id },
        select: {
          id: true,
          transportationId: true,
          title: true,
        },
      });
      await this.createTransportationHistoryInBackground({
        type: 'Breakdown Delete',
        description: `(${id}) Breakdown (${breakdown.title}) deleted.`,
        transportationId: breakdown.transportationId,
        completedById: user.id,
      });
      const transportationUsers = await this.getTransportationUserIds(
        breakdown.transportationId,
        user.id
      );
      for (let index = 0; index < transportationUsers.length; index++) {
        await this.notificationService.createInBackground({
          userId: transportationUsers[index],
          body: `${user.fullName} (${user.rcno}) deleted breakdown (${breakdown.id}) on transportation ${breakdown.transportationId}`,
          link: `/transportation/${breakdown.transportationId}`,
        });
      }
      await this.prisma.transportationBreakdown.delete({
        where: { id },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Set transportation breakdown status. */
  async setTransportationBreakdownStatus(
    user: User,
    id: number,
    status: BreakdownStatus
  ) {
    try {
      let completedFlag = false;
      let transportationStatus;
      const breakdown = await this.prisma.transportationBreakdown.findFirst({
        where: { id },
        select: {
          transportationId: true,
        },
      });
      if (status == 'Done') {
        completedFlag = true;
        transportationStatus = 'Working';
        await this.createTransportationHistoryInBackground({
          type: 'Repair Status',
          description: `(${id}) Set status to ${status}.`,
          transportationId: breakdown.transportationId,
          completedById: user.id,
        });
      }
      if (status == 'Pending') {
        transportationStatus = 'Pending';
        await this.createTransportationHistoryInBackground({
          type: 'Repair Status',
          description: `(${id}) Set status to ${status}.`,
          transportationId: breakdown.transportationId,
          completedById: user.id,
        });
      }
      if (status == 'Breakdown') {
        transportationStatus = 'Breakdown';
        await this.createTransportationHistoryInBackground({
          type: 'Repair Status',
          description: `(${id}) Set status to ${status}.`,
          transportationId: breakdown.transportationId,
          completedById: user.id,
        });
        const transportationUsers = await this.getTransportationUserIds(
          breakdown.transportationId,
          user.id
        );
        for (let index = 0; index < transportationUsers.length; index++) {
          await this.notificationService.createInBackground({
            userId: transportationUsers[index],
            body: `${user.fullName} (${user.rcno}) set breakdown status to (${status}) on transportation ${breakdown.transportationId}`,
            link: `/transportation/${breakdown.transportationId}`,
          });
        }
        //set transportation status
        await this.prisma.transportation.update({
          where: { id: breakdown.transportationId },
          data: { status: transportationStatus },
        });
      }

      await this.prisma.transportationBreakdown.update({
        where: { id },
        data: completedFlag
          ? { completedById: user.id, completedAt: new Date(), status }
          : { completedById: null, completedAt: null, status },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Get transportationRepair. Results are paginated. User cursor argument to go forward/backward. */
  async getTransportationRepairWithPagination(
    user: User,
    args: TransportationRepairConnectionArgs
  ): Promise<PaginatedTransportationRepair> {
    const { limit, offset } = getPagingParameters(args);
    const limitPlusOne = limit + 1;
    const { transportationId, search } = args;

    // eslint-disable-next-line prefer-const
    let where: any = { AND: [] };
    if (transportationId) {
      where.AND.push({ transportationId });
    }
    //for now these only
    if (search) {
      const or: any = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
      // If search contains all numbers, search the machine ids as well
      if (/^(0|[1-9]\d*)$/.test(search)) {
        or.push({ id: parseInt(search) });
      }
      where.AND.push({
        OR: or,
      });
    }
    const transportationRepair =
      await this.prisma.transportationRepair.findMany({
        skip: offset,
        take: limitPlusOne,
        where,
        orderBy: { id: 'desc' },
      });

    const count = await this.prisma.transportationRepair.count({ where });
    const { edges, pageInfo } = connectionFromArraySlice(
      transportationRepair.slice(0, limit),
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

  //** Get transportationBreakdown. Results are paginated. User cursor argument to go forward/backward. */
  async getTransportationBreakdownWithPagination(
    user: User,
    args: TransportationBreakdownConnectionArgs
  ): Promise<PaginatedTransportationBreakdown> {
    const { limit, offset } = getPagingParameters(args);
    const limitPlusOne = limit + 1;
    const { transportationId, search } = args;

    // eslint-disable-next-line prefer-const
    let where: any = { AND: [] };
    if (transportationId) {
      where.AND.push({ transportationId });
    }
    //for now these only
    if (search) {
      const or: any = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
      // If search contains all numbers, search the machine ids as well
      if (/^(0|[1-9]\d*)$/.test(search)) {
        or.push({ id: parseInt(search) });
      }
      where.AND.push({
        OR: or,
      });
    }
    const transportationBreakdown =
      await this.prisma.transportationBreakdown.findMany({
        skip: offset,
        take: limitPlusOne,
        where,
        include: {
          completedBy: true,
        },
        orderBy: { id: 'desc' },
      });

    const count = await this.prisma.transportationBreakdown.count({ where });
    const { edges, pageInfo } = connectionFromArraySlice(
      transportationBreakdown.slice(0, limit),
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

  //** Get transportation spare PR. Results are paginated. User cursor argument to go forward/backward. */
  async getTransportationSparePRWithPagination(
    user: User,
    args: TransportationSparePRConnectionArgs
  ): Promise<PaginatedTransportationSparePR> {
    const { limit, offset } = getPagingParameters(args);
    const limitPlusOne = limit + 1;
    const { transportationId, search } = args;

    // eslint-disable-next-line prefer-const
    let where: any = { AND: [] };
    if (transportationId) {
      where.AND.push({ transportationId });
    }
    //for now these only
    if (search) {
      const or: any = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
      // If search contains all numbers, search the machine ids as well
      if (/^(0|[1-9]\d*)$/.test(search)) {
        or.push({ id: parseInt(search) });
      }
      where.AND.push({
        OR: or,
      });
    }
    const transportationSparePR =
      await this.prisma.transportationSparePR.findMany({
        skip: offset,
        take: limitPlusOne,
        where,
        include: {
          completedBy: true,
        },
        orderBy: { id: 'desc' },
      });

    const count = await this.prisma.transportationSparePR.count({ where });
    const { edges, pageInfo } = connectionFromArraySlice(
      transportationSparePR.slice(0, limit),
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

  //** Get transportation's history. Results are paginated. User cursor argument to go forward/backward. */
  async getTransportationHistoryWithPagination(
    user: User,
    args: TransportationHistoryConnectionArgs
  ): Promise<PaginatedTransportationHistory> {
    const { limit, offset } = getPagingParameters(args);
    const limitPlusOne = limit + 1;
    const { search, transportationId, location, from, to } = args;
    const fromDate = moment(from).startOf('day');
    const toDate = moment(to).endOf('day');

    // eslint-disable-next-line prefer-const
    let where: any = { AND: [] };

    if (transportationId) {
      where.AND.push({ transportationId });
    }
    if (location?.length > 0) {
      where.AND.push({
        location: {
          in: location,
        },
      });
    }

    if (from && to) {
      where.AND.push({
        createdAt: { gte: fromDate.toDate(), lte: toDate.toDate() },
      });
    }
    //for now these only
    if (search) {
      const or: any = [
        { type: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
      // If search contains all numbers, search the transportation ids as well
      if (/^(0|[1-9]\d*)$/.test(search)) {
        or.push({ id: parseInt(search) });
      }
      where.AND.push({
        OR: or,
      });
    }
    const transportationHistory =
      await this.prisma.transportationHistory.findMany({
        skip: offset,
        take: limitPlusOne,
        where,
        include: {
          completedBy: true,
        },
        orderBy: { id: 'desc' },
      });

    const count = await this.prisma.transportationHistory.count({ where });
    const { edges, pageInfo } = connectionFromArraySlice(
      transportationHistory.slice(0, limit),
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

  //** Assign 'user' to transportation. */
  async assignUserToTransportation(
    user: User,
    transportationId: number,
    userIds: number[]
  ) {
    try {
      const transportationUserIds = await this.getTransportationUserIds(
        transportationId,
        user.id
      );
      const transportationUsersExceptNewAssignments =
        transportationUserIds.filter((id) => !userIds.includes(id));
      const newAssignments = await this.prisma.user.findMany({
        where: {
          id: { in: userIds },
        },
        select: {
          id: true,
          fullName: true,
          rcno: true,
          email: true,
        },
      });

      // Text format new assignments into a readable list with commas and 'and'
      // at the end.
      const newAssignmentsFormatted = newAssignments
        .map((a) => `${a.fullName} (${a.rcno})`)
        .join(', ')
        .replace(/, ([^,]*)$/, ' and $1');
      // Notification to transportation assigned users except new assignments
      for (const id of transportationUsersExceptNewAssignments) {
        await this.notificationService.createInBackground({
          userId: id,
          body: `${user.fullName} (${user.rcno}) assigned ${newAssignmentsFormatted} to transportation ${transportationId}`,
          link: `/transportation/${transportationId}`,
        });
        await this.createTransportationHistoryInBackground({
          type: 'User Assign',
          description: `${user.fullName} (${user.rcno}) assigned ${newAssignmentsFormatted} to transportation ${transportationId}`,
          transportationId: transportationId,
          completedById: user.id,
        });
      }

      // Notification to new assignments
      const newAssignmentsWithoutCurrentUser = newAssignments.filter(
        (na) => na.id !== user.id
      );
      const emailBody = `You have been assigned to transportation ${transportationId}`;
      for (const newAssignment of newAssignmentsWithoutCurrentUser) {
        await this.notificationService.createInBackground({
          userId: newAssignment.id,
          body: emailBody,
          link: `/transportation/${transportationId}`,
        });
        await this.createTransportationHistoryInBackground({
          type: 'User Assign',
          description: `${newAssignment.fullName} (${newAssignment.rcno}) assigned to transportation.`,
          transportationId: transportationId,
          completedById: user.id,
        });
      }
      await this.prisma.transportationAssignment.createMany({
        data: userIds.map((userId) => ({
          transportationId,
          userId,
        })),
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new BadRequestException(
          `User is already assigned to this transportation.`
        );
      } else {
        console.log(e);
        throw new InternalServerErrorException('Unexpected error occured.');
      }
    }
  }

  //** unassign user from transportation. */
  async unassignUserFromTransportation(
    user: User,
    transportationId: number,
    userId: number
  ) {
    try {
      const unassign = await this.prisma.user.findFirst({
        where: {
          id: userId,
        },
        select: {
          fullName: true,
          rcno: true,
        },
      });
      await this.createTransportationHistoryInBackground({
        type: 'User Unassigned',
        description: `${unassign.fullName} (${unassign.rcno}) unassigned from transportation.`,
        transportationId: transportationId,
        completedById: user.id,
      });
      await this.prisma.transportationAssignment.deleteMany({
        where: { transportationId, userId },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Get transportation periodic maintenance. Results are paginated. User cursor argument to go forward/backward. */
  async getTransportationPeriodicMaintenanceWithPagination(
    user: User,
    args: TransportationPeriodicMaintenanceConnectionArgs
  ): Promise<PaginatedTransportationPeriodicMaintenance> {
    const { limit, offset } = getPagingParameters(args);
    const limitPlusOne = limit + 1;
    const { transportationId, search } = args;

    // eslint-disable-next-line prefer-const
    let where: any = { AND: [] };
    if (transportationId) {
      where.AND.push({ transportationId });
    }

    //for now these only
    if (search) {
      const or: any = [
        { model: { contains: search, mode: 'insensitive' } },
        { machineNumber: { contains: search, mode: 'insensitive' } },
      ];
      // If search contains all numbers, search the machine ids as well
      if (/^(0|[1-9]\d*)$/.test(search)) {
        or.push({ id: parseInt(search) });
      }
      where.AND.push({
        OR: or,
      });
    }
    const transportationPeriodicMaintenance =
      await this.prisma.transportationPeriodicMaintenance.findMany({
        skip: offset,
        take: limitPlusOne,
        where,
        include: {
          completedBy: true,
          verifiedBy: true,
          transportationPeriodicMaintenanceTask: {
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
        orderBy: { id: 'desc' },
      });

    const count = await this.prisma.transportationPeriodicMaintenance.count({
      where,
    });
    const { edges, pageInfo } = connectionFromArraySlice(
      transportationPeriodicMaintenance.slice(0, limit),
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

  //** Create transportation history */
  async createTransportationHistory(
    transportationHistory: TransportationHistoryInterface
  ) {
    const transportation = await this.prisma.transportation.findFirst({
      where: { id: transportationHistory.transportationId },
      select: {
        status: true,
        type: true,
        location: true,
        id: true,
      },
    });
    const transportationChecklist = await this.prisma.checklist.findFirst({
      where: {
        transportationId: transportation.id,
        NOT: [{ workingHour: null }],
      },
      orderBy: {
        from: 'desc',
      },
    });

    const now = moment();
    const workingHour = transportationChecklist?.workingHour;
    let idleHour = 0;
    let breakdownHour = 0;

    if (transportation.status === 'Idle') {
      const fromDate = await this.prisma.transportationHistory.findFirst({
        where: {
          transportationStatus: 'Working',
        },
        orderBy: {
          id: 'desc',
        },
      });
      const duration = moment.duration(now.diff(fromDate.createdAt));
      idleHour = duration.asHours();
    }
    if (transportation.status === 'Breakdown') {
      const fromDate = await this.prisma.transportationHistory.findFirst({
        where: {
          transportationStatus: 'Working',
        },
        orderBy: {
          id: 'desc',
        },
      });
      const duration = moment.duration(now.diff(fromDate.createdAt));
      breakdownHour = duration.asHours();
    }
    await this.prisma.transportationHistory.create({
      data: {
        transportationId: transportationHistory.transportationId,
        type: transportationHistory.type,
        description: transportationHistory.description,
        completedById: transportationHistory.completedById,
        transportationStatus: transportationHistory.transportationStatus
          ? transportationHistory.transportationStatus
          : transportation.status,
        transportationType: transportation.type,
        workingHour: workingHour ? workingHour : 0,
        idleHour: idleHour,
        breakdownHour: breakdownHour,
        location: transportation.location,
      },
    });
  }

  //** Create transportation history in background */
  async createTransportationHistoryInBackground(
    transportationHistory: TransportationHistoryInterface
  ) {
    await this.transportationHistoryQueue.add('createTransportationHistory', {
      transportationHistory,
    });
  }

  //** Delete transportation attachment. */
  async deleteTransportationAttachment(id: number, user: User) {
    try {
      const attachment = await this.prisma.transportationAttachment.findFirst({
        where: { id },
        select: {
          id: true,
          transportationId: true,
          description: true,
        },
      });
      await this.createTransportationHistoryInBackground({
        type: 'Attachment Delete',
        description: `(${id}) Attachment (${attachment.description}) deleted.`,
        transportationId: attachment.transportationId,
        completedById: user.id,
      });
      const transportationUsers = await this.getTransportationUserIds(
        attachment.transportationId,
        user.id
      );
      for (let index = 0; index < transportationUsers.length; index++) {
        await this.notificationService.createInBackground({
          userId: transportationUsers[index],
          body: `${user.fullName} (${user.rcno}) deleted attachment (${attachment.id}) on transportation ${attachment.transportationId}`,
          link: `/transportation/${attachment.transportationId}`,
        });
      }
      await this.prisma.transportationAttachment.delete({
        where: { id },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Edit transportation attachment */
  async editTransportationAttachment(
    user: User,
    id: number,
    description: string
  ) {
    try {
      const attachment = await this.prisma.transportationAttachment.findFirst({
        where: { id },
        select: {
          id: true,
          transportationId: true,
          description: true,
        },
      });
      if (attachment.description != description) {
        await this.createTransportationHistoryInBackground({
          type: 'Attachment Edit',
          description: `(${id}) Description changed from ${attachment.description} to ${description}.`,
          transportationId: attachment.transportationId,
          completedById: user.id,
        });
      }
      const transportationUsers = await this.getTransportationUserIds(
        attachment.transportationId,
        user.id
      );
      for (let index = 0; index < transportationUsers.length; index++) {
        await this.notificationService.createInBackground({
          userId: transportationUsers[index],
          body: `${user.fullName} (${user.rcno}) edited attachment (${attachment.id}) on transportation ${attachment.transportationId}`,
          link: `/transportation/${attachment.transportationId}`,
        });
      }
      await this.prisma.transportationAttachment.update({
        where: { id },
        data: { description },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Get transportation report */
  async getTransportationReport(user: User, from: Date, to: Date) {
    try {
      const fromDate = moment(from).startOf('day');
      const statusHistoryArray = [];
      const transportationReportArray = [];
      const toDate = moment(to).endOf('day');

      //get all transportation
      const transportations = await this.prisma.transportation.findMany({
        select: {
          id: true,
          type: true,
        },
      });

      //get all history of transportation based on closest date
      for (let index = 0; index < transportations.length; index++) {
        const statusHistory = await this.prisma.transportationHistory.findFirst(
          {
            where: {
              transportationId: transportations[index].id,
              createdAt: { lte: toDate.toDate() },
            },
            orderBy: {
              id: 'desc',
            },
          }
        );
        statusHistoryArray.push(statusHistory);
      }

      //find all working and breakdown status of transportation type
      for (let i = 0; i < statusHistoryArray.length; i++) {
        let working = 0;
        let breakdown = 0;
        statusHistoryArray.find((e) => {
          if (
            e?.transportationStatus == 'Working' &&
            e?.transportationType == statusHistoryArray[i]?.transportationType
          ) {
            working++;
          }
          if (
            e?.transportationStatus == 'Breakdown' &&
            e?.transportationType == statusHistoryArray[i]?.transportationType
          ) {
            breakdown++;
          }
        });
        //if it exist then don't add to array
        let found = false;
        transportationReportArray?.find((e) => {
          if (e.type == statusHistoryArray[i]?.transportationType) {
            found = true;
          }
        });
        if (!found) {
          transportationReportArray.push({
            type: statusHistoryArray[i]?.transportationType,
            working: working,
            breakdown: breakdown,
          });
        }
      }
      return transportationReportArray;
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  // Get unique array of ids of transportation assigned users
  async getTransportationUserIds(
    transportationId: number,
    removeUserId?: number
  ): Promise<number[]> {
    // get all users involved in ticket
    const getAssignedUsers =
      await this.prisma.transportationAssignment.findMany({
        where: {
          transportationId,
        },
      });

    const combinedIDs = [...getAssignedUsers.map((a) => a.userId)];

    // get unique ids only
    const unique = [...new Set(combinedIDs)];

    // If removeUserId variable has not been passed, return array
    if (!removeUserId) {
      return unique;
    }

    // Otherwise remove the given user id from array and then return
    return unique.filter((id) => {
      return id != removeUserId;
    });
  }

  //check periodic maintenance every hour. notify based on the notification hour
  //set status to Missed based on period
  @Cron(CronExpression.EVERY_HOUR)
  async updatePeriodicMaintenanceStatus() {
    const now = moment();
    const periodicMaintenance =
      await this.prisma.transportationPeriodicMaintenance.findMany({
        include: {
          transportation: {
            select: {
              currentMileage: true,
            },
          },
        },
      });

    for (let index = 0; index < periodicMaintenance.length; index++) {
      const value = periodicMaintenance[index].value;

      //const fixedDate = moment(periodicMaintenance[index].fixedDate);
      const notifDate = moment(periodicMaintenance[index].startDate);
      if (periodicMaintenance[index].measurement === 'hour') {
        notifDate.add(value, 'h');
      } else if (periodicMaintenance[index].measurement === 'day') {
        notifDate.add(value, 'd');
      } else if (periodicMaintenance[index].measurement === 'km') {
        if (value >= periodicMaintenance[index].transportation.currentMileage) {
          const users = await this.prisma.transportationAssignment.findMany({
            where: {
              transportationId: periodicMaintenance[index].transportationId,
            },
          });
          for (let index = 0; index < users.length; index++) {
            await this.notificationService.createInBackground({
              userId: users[index].userId,
              body: `Periodic maintenance (${periodicMaintenance[index].id}) on transportation ${periodicMaintenance[index].transportationId} km reminder`,
              link: `/transportation/${periodicMaintenance[index].transportationId}`,
            });
          }
          await this.prisma.transportationPeriodicMaintenance.update({
            where: {
              id: periodicMaintenance[index].id,
            },
            data: {
              startDate: moment(notifDate).toDate(),
            },
          });
        }
      }
      //notifDate.add(notifHour, 'h');

      if (notifDate.isSame(now)) {
        const users = await this.prisma.transportationAssignment.findMany({
          where: {
            transportationId: periodicMaintenance[index].transportationId,
          },
        });
        for (let index = 0; index < users.length; index++) {
          await this.notificationService.createInBackground({
            userId: users[index].userId,
            body: `Periodic maintenance (${periodicMaintenance[index].id}) on transportation ${periodicMaintenance[index].transportationId} reminder`,
            link: `/transportation/${periodicMaintenance[index].transportationId}`,
          });
        }
      }
    }
  }

  //** Get transportation usage */
  async getTransportationUsage(
    user: User,
    transportationId: number,
    from: Date,
    to: Date
  ) {
    try {
      const fromDate = moment(from).startOf('day');
      const toDate = moment(to).endOf('day');
      const key = `transportationUsageHistoryByDate-${transportationId}-${fromDate.format(
        'DD-MMMM-YYYY'
      )}-${toDate.format('DD-MMMM-YYYY')}`;
      let usageHistoryByDate = await this.redisCacheService.get(key);
      if (!usageHistoryByDate) {
        usageHistoryByDate = [];
        //get all usage of transportation between date
        const transportationUsageHistoryArray =
          await this.prisma.transportationHistory.findMany({
            where: {
              transportationId,
              createdAt: { gte: fromDate.toDate(), lte: toDate.toDate() },
            },
            orderBy: {
              id: 'desc',
            },
          });
        const days = toDate.diff(fromDate, 'days') + 1;
        for (let i = 0; i < days; i++) {
          const day = fromDate.clone().add(i, 'day');
          const workingHour =
            transportationUsageHistoryArray.find((usage) =>
              moment(usage.createdAt).isSame(day, 'day')
            )?.workingHour ?? 0;
          const idleHour =
            transportationUsageHistoryArray.find((usage) =>
              moment(usage.createdAt).isSame(day, 'day')
            )?.idleHour ?? 0;
          const breakdownHour =
            transportationUsageHistoryArray.find((usage) =>
              moment(usage.createdAt).isSame(day, 'day')
            )?.breakdownHour ?? 0;
          usageHistoryByDate.push({
            date: day.toDate(),
            workingHour,
            idleHour,
            breakdownHour,
          });
        }
      }
      return usageHistoryByDate;
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Edit Transportation usage */
  async editTransportationUsage(
    user: User,
    id: number,
    currentMileage: number,
    lastServiceMileage: number
  ) {
    try {
      const transportation = await this.prisma.transportation.findFirst({
        where: { id },
      });

      if (transportation.currentMileage != currentMileage) {
        await this.createTransportationHistoryInBackground({
          type: 'Transportation Edit',
          description: `Current Mileage changed from ${transportation.currentMileage} to ${currentMileage}.`,
          transportationId: id,
          completedById: user.id,
        });
      }
      if (transportation.lastServiceMileage != lastServiceMileage) {
        await this.createTransportationHistoryInBackground({
          type: 'Transportation Edit',
          description: `Last Service Mileage changed from ${transportation.lastServiceMileage} to ${lastServiceMileage}.`,
          transportationId: id,
          completedById: user.id,
        });
      }
      const transportationUsers = await this.getTransportationUserIds(
        id,
        user.id
      );
      for (let index = 0; index < transportationUsers.length; index++) {
        await this.notificationService.createInBackground({
          userId: transportationUsers[index],
          body: `${user.fullName} (${user.rcno}) edited transportation (${id})}`,
          link: `/transportation/${id}`,
        });
      }

      await this.prisma.transportation.update({
        where: { id },
        data: {
          currentMileage,
          lastServiceMileage,
        },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //check breakdown every week. notify assigned users if breakdown exists
  @Cron(CronExpression.EVERY_WEEK)
  async checkTransportationBreakdownExist() {
    const breakdown = await this.prisma.transportationBreakdown.findMany();
    const now = moment().startOf('day');

    for (let index = 0; index < breakdown.length; index++) {
      if (breakdown[index].status === 'Breakdown') {
        const end = moment(breakdown[index].createdAt).endOf('day');

        if (moment.duration(end.diff(now)).asDays() >= 7) {
          const users = await this.prisma.transportationAssignment.findMany({
            where: {
              transportationId: breakdown[index].transportationId,
            },
          });

          for (let index = 0; index < users.length; index++) {
            await this.notificationService.createInBackground({
              userId: users[index].userId,
              body: `Reminder: Transportation ${breakdown[index].transportationId} has been broken for 1 week`,
              link: `/transportation/${breakdown[index].transportationId}`,
            });
          }
          await this.createTransportationHistoryInBackground({
            type: 'Breakdown',
            description: `(${breakdown[index].id}) breakdown has been notified to all assigned users.`,
            transportationId: breakdown[index].transportationId,
          });
        }
      }
    }
  }

  //** Create transportation periodic maintenance Sub task. */
  async createTransportationPeriodicMaintenanceTask(
    user: User,
    periodicMaintenanceId: number,
    name: string,
    parentTaskId?: number
  ) {
    try {
      await this.prisma.transportationPeriodicMaintenanceTask.create({
        data: {
          parentTaskId,
          periodicMaintenanceId,
          name,
        },
      });
      const transportationPeriodicMaintenance =
        await this.prisma.transportationPeriodicMaintenance.findFirst({
          where: {
            id: periodicMaintenanceId,
          },
          include: {
            transportation: {
              select: {
                id: true,
              },
            },
          },
        });
      const transportation = transportationPeriodicMaintenance.transportation;
      await this.createTransportationHistoryInBackground({
        type: 'Add Sub task',
        description: `Added sub task to periodic maintenance (${periodicMaintenanceId})`,
        transportationId: transportation.id,
        completedById: user.id,
      });
      const transportationUsers = await this.getTransportationUserIds(
        transportation.id,
        user.id
      );
      for (let index = 0; index < transportationUsers.length; index++) {
        await this.notificationService.createInBackground({
          userId: transportationUsers[index],
          body: `${user.fullName} (${user.rcno}) added new sub task in transportation (${transportation.id})'s periodic maintenance (${periodicMaintenanceId}) `,
          link: `/transportation/${transportation.id}`,
        });
      }
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Set task as complete or incomplete. */
  async toggleTransportationPMTask(user: User, id: number, complete: boolean) {
    const completion = complete
      ? { completedById: user.id, completedAt: new Date() }
      : { completedById: null, completedAt: null };
    const transactions: any = [
      this.prisma.transportationPeriodicMaintenanceTask.update({
        where: { id },
        data: completion,
      }),
    ];
    const subTasks =
      await this.prisma.transportationPeriodicMaintenanceTask.findMany({
        where: { parentTaskId: id },
        select: { id: true },
      });
    const subTaskIds = subTasks.map((st) => st.id);
    if (subTaskIds.length > 0) {
      transactions.push(
        this.prisma.transportationPeriodicMaintenanceTask.updateMany({
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

  //** Delete task. */
  async deleteTransportationPMTask(user: User, id: number) {
    try {
      await this.prisma.transportationPeriodicMaintenanceTask.delete({
        where: { id },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Get transportations utilization. Results are paginated. User cursor argument to go forward/backward. */
  async getTransportationUtilizationWithPagination(
    user: User,
    args: TransportationConnectionArgs
  ): Promise<PaginatedTransportation> {
    const { limit, offset } = getPagingParameters(args);
    const limitPlusOne = limit + 1;
    const { createdById, search, assignedToId, status, location } = args;

    // eslint-disable-next-line prefer-const
    let where: any = { AND: [] };
    if (createdById) {
      where.AND.push({ createdById });
    }

    if (assignedToId) {
      where.AND.push({
        assignees: { some: { userId: assignedToId } },
      });
    }

    if (status) {
      where.AND.push({ status });
    }

    if (location.length > 0) {
      where.AND.push({
        location: {
          in: location,
        },
      });
    }

    if (search) {
      const or: any = [
        { model: { contains: search, mode: 'insensitive' } },
        { machineNumber: { contains: search, mode: 'insensitive' } },
      ];
      // If search contains all numbers, search the machine ids as well
      if (/^(0|[1-9]\d*)$/.test(search)) {
        or.push({ id: parseInt(search) });
      }
      where.AND.push({
        OR: or,
      });
    }
    const transportation = await this.prisma.transportation.findMany({
      skip: offset,
      take: limitPlusOne,
      where,
      include: {
        histories: {
          take: 1,
          orderBy: {
            id: 'desc',
          },
        },
      },
    });

    const count = await this.prisma.transportation.count({ where });
    const { edges, pageInfo } = connectionFromArraySlice(
      transportation.slice(0, limit),
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

  //** Get all transportation usage*/
  async getAllTransportationUsage(user: User, from: Date, to: Date) {
    try {
      const today = moment();
      const fromDate = moment(from).startOf('day');
      const toDate = moment(to).endOf('day');
      const key = `allTransportationUsageHistoryByDate-${fromDate.format(
        'DD-MMMM-YYYY'
      )}-${toDate.format('DD-MMMM-YYYY')}`;
      let usageHistoryByDate = await this.redisCacheService.get(key);
      if (!usageHistoryByDate) {
        usageHistoryByDate = [];
        //get all usage of transportation between date
        const transportationUsageHistoryArray =
          await this.prisma.transportationHistory.findMany({
            where: {
              createdAt: { gte: fromDate.toDate(), lte: toDate.toDate() },
            },
            orderBy: {
              id: 'desc',
            },
          });
        const days = toDate.diff(fromDate, 'days') + 1;
        for (let i = 0; i < days; i++) {
          const day = fromDate.clone().add(i, 'day');
          const workingHour =
            transportationUsageHistoryArray.find((usage) =>
              moment(usage.createdAt).isSame(day, 'day')
            )?.workingHour ?? 0;
          const idleHour =
            transportationUsageHistoryArray.find((usage) =>
              moment(usage.createdAt).isSame(day, 'day')
            )?.idleHour ?? 0;
          const breakdownHour =
            transportationUsageHistoryArray.find((usage) =>
              moment(usage.createdAt).isSame(day, 'day')
            )?.breakdownHour ?? 0;
          const totalHour = workingHour + idleHour + breakdownHour;
          const workingPercentage = (workingHour / totalHour) * 100;
          const idlePercentage = (idleHour / totalHour) * 100;
          const breakdownPercentage = (breakdownHour / totalHour) * 100;
          usageHistoryByDate.push({
            date: day.toDate(),
            workingHour,
            idleHour,
            breakdownHour,
            totalHour,
            workingPercentage: workingPercentage ? workingPercentage : 0,
            idlePercentage: idlePercentage ? idlePercentage : 0,
            breakdownPercentage: breakdownPercentage ? breakdownPercentage : 0,
          });
        }
      }
      return usageHistoryByDate;
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Set periodic maintenance as verified or unverified. */
  async toggleVerifyTransportationPeriodicMaintenance(
    user: User,
    id: number,
    verify: boolean
  ) {
    try {
      const checklist =
        await this.prisma.transportationPeriodicMaintenance.findFirst({
          where: {
            id,
          },
          select: {
            transportationId: true,
          },
        });
      await this.prisma.transportationPeriodicMaintenance.update({
        where: { id },
        data: verify
          ? { verifiedById: user.id, verifiedAt: new Date() }
          : { verifiedById: null, verifiedAt: null },
      });

      const transportationUsers = await this.getTransportationUserIds(
        checklist.transportationId,
        user.id
      );
      for (let index = 0; index < transportationUsers.length; index++) {
        await this.notificationService.createInBackground({
          userId: transportationUsers[index],
          body: `${user.fullName} (${user.rcno}) verified periodic maintenance (${id}) on transportation ${checklist.transportationId}`,
          link: `/machine/${checklist.transportationId}`,
        });
      }
      await this.createTransportationHistoryInBackground({
        type: 'Periodic maintenance verify',
        description: verify
          ? `Periodic maintenance (${id}) has been verified to be completed.`
          : `Periodic maintenance (${id}) has been unverified.`,
        transportationId: checklist.transportationId,
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Get all transportation periodic maintenance. Results are paginated. User cursor argument to go forward/backward. */
  async getAllTransportationPeriodicMaintenanceWithPagination(
    user: User,
    args: TransportationPeriodicMaintenanceConnectionArgs
  ): Promise<PaginatedTransportationPeriodicMaintenance> {
    const { limit, offset } = getPagingParameters(args);
    const limitPlusOne = limit + 1;
    const { search, status, location } = args;

    // eslint-disable-next-line prefer-const
    let where: any = { AND: [] };

    if (status) {
      where.AND.push({ status });
    }

    if (location.length > 0) {
      where.AND.push({
        transportation: {
          location: {
            in: location,
          },
        },
      });
    }

    if (search) {
      const or: any = [{ title: { contains: search, mode: 'insensitive' } }];
      // If search contains all numbers, search the machine ids as well
      if (/^(0|[1-9]\d*)$/.test(search)) {
        or.push({ id: parseInt(search) });
      }
      where.AND.push({
        OR: or,
      });
    }
    const transportationPeriodicMaintenance =
      await this.prisma.transportationPeriodicMaintenance.findMany({
        skip: offset,
        take: limitPlusOne,
        where,
        include: {
          transportation: true,
        },
        orderBy: { id: 'desc' },
      });

    const count = await this.prisma.transportationPeriodicMaintenance.count({
      where,
    });
    const { edges, pageInfo } = connectionFromArraySlice(
      transportationPeriodicMaintenance.slice(0, limit),
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

  //** Get all transportation periodic maintenance tasks. Results are paginated. User cursor argument to go forward/backward. */
  async getAllTransportationPeriodicMaintenanceTasksWithPagination(
    user: User,
    args: TransportationPeriodicMaintenanceConnectionArgs
  ): Promise<PaginatedTransportationPeriodicMaintenanceTask> {
    const { limit, offset } = getPagingParameters(args);
    const limitPlusOne = limit + 1;
    const { search, complete, location, status, assignedToId } = args;

    // eslint-disable-next-line prefer-const
    let where: any = { AND: [] };

    if (assignedToId) {
      where.AND.push({
        periodicMaintenance: {
          transportation: {
            assignees: { some: { userId: assignedToId } },
          },
        },
      });
    }

    if (location?.length > 0) {
      where.AND.push({
        periodicMaintenance: {
          transportation: {
            location: {
              in: location,
            },
          },
        },
      });
    }

    if (status) {
      where.AND.push({
        periodicMaintenance: {
          status: status,
        },
      });
    }

    if (complete) {
      where.AND.push({
        NOT: [{ completedAt: null }],
      });
    }

    if (search) {
      const or: any = [{ name: { contains: search, mode: 'insensitive' } }];
      // If search contains all numbers, search the transportation ids as well
      if (/^(0|[1-9]\d*)$/.test(search)) {
        or.push({ id: parseInt(search) });
      }
      where.AND.push({
        OR: or,
      });
    }
    const transportationPeriodicMaintenanceTask =
      await this.prisma.transportationPeriodicMaintenanceTask.findMany({
        skip: offset,
        take: limitPlusOne,
        where,
        include: {
          periodicMaintenance: {
            include: {
              transportation: {
                include: {
                  assignees: {
                    include: {
                      user: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { id: 'desc' },
      });

    const count = await this.prisma.transportationPeriodicMaintenanceTask.count(
      {
        where,
      }
    );
    const { edges, pageInfo } = connectionFromArraySlice(
      transportationPeriodicMaintenanceTask.slice(0, limit),
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

  //** Get all transporation pm task status count*/
  async getAllTransportationPMTaskStatusCount(
    user: User,
    assignedToId?: number
  ) {
    try {
      const key = `allTransportationPMTaskStatusCount`;
      let pmTaskStatusCount = await this.redisCacheService.get(key);
      let pending;
      let done;
      if (!pmTaskStatusCount) {
        pmTaskStatusCount = '';

        if (assignedToId) {
          pending =
            await this.prisma.transportationPeriodicMaintenanceTask.findMany({
              where: {
                completedAt: null,
                periodicMaintenance: {
                  transportation: {
                    assignees: { some: { userId: assignedToId } },
                  },
                },
              },
            });
        } else {
          pending =
            await this.prisma.transportationPeriodicMaintenanceTask.findMany({
              where: {
                completedAt: null,
              },
            });
        }

        if (assignedToId) {
          done =
            await this.prisma.transportationPeriodicMaintenanceTask.findMany({
              where: {
                NOT: [{ completedAt: null }],
                periodicMaintenance: {
                  transportation: {
                    assignees: { some: { userId: assignedToId } },
                  },
                },
              },
            });
        } else {
          done =
            await this.prisma.transportationPeriodicMaintenanceTask.findMany({
              where: {
                NOT: [{ completedAt: null }],
              },
            });
        }

        pmTaskStatusCount = {
          pending: pending.length ?? 0,
          done: done.length ?? 0,
        };
      }
      return pmTaskStatusCount;
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async getAllTransportationPMStatusCount(user: User) {
    try {
      const key = `allTransportationPMStatusCount`;
      let pmStatusCount = await this.redisCacheService.get(key);
      if (!pmStatusCount) {
        pmStatusCount = '';
        const missed =
          await this.prisma.transportationPeriodicMaintenance.findMany({
            where: {
              status: 'Missed',
            },
          });
        const pending =
          await this.prisma.transportationPeriodicMaintenance.findMany({
            where: {
              status: 'Pending',
            },
          });
        const done =
          await this.prisma.transportationPeriodicMaintenance.findMany({
            where: {
              status: 'Done',
            },
          });

        pmStatusCount = {
          missed: missed.length ?? 0,
          pending: pending.length ?? 0,
          done: done.length ?? 0,
        };
      }
      return pmStatusCount;
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Edit transportation location */
  async editTransportationLocation(user: User, id: number, location: string) {
    try {
      const transportation = await this.prisma.transportation.findFirst({
        where: {
          id,
        },
        select: {
          location: true,
        },
      });

      if (transportation.location != location) {
        const transportationUsers = await this.getTransportationUserIds(
          id,
          user.id
        );
        for (let index = 0; index < transportationUsers.length; index++) {
          await this.notificationService.createInBackground({
            userId: transportationUsers[index],
            body: `${user.fullName} (${user.rcno}) changed location from ${transportation.location} to ${location}.`,
            link: `/transportation/${id}`,
          });
        }
        await this.createTransportationHistoryInBackground({
          type: 'Transportation Edit',
          description: `Location changed from ${transportation.location} to ${location}.`,
          transportationId: id,
          completedById: user.id,
        });

        await this.prisma.transportation.update({
          where: { id },
          data: {
            location,
          },
        });
      }
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }
}
