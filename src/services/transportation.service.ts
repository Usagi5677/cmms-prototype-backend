import { PrismaService } from 'nestjs-prisma';
import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
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

export interface TransportationHistoryInterface {
  transportationId: number;
  type: string;
  description: string;
  completedById?: number;
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
    private configService: ConfigService
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
      const interServiceMileage = currentMileage - lastServiceMileage;
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
          interServiceMileage,
        },
      });
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
  async deleteTransportation(id: number) {
    try {
      await this.prisma.transportation.delete({
        where: { id },
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
    currentMileage: number,
    lastServiceMileage: number,
    transportType: string,
    registeredDate: Date
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
        checklistItems: true,
        assignees: { include: { user: true } },
      },
    });
    if (!transportation)
      throw new BadRequestException('Transportation not found.');

    // Assigning data from db to the gql shape as it does not match 1:1
    const transportationResp = new Transportation();
    Object.assign(transportationResp, transportation);
    transportationResp.assignees = transportation.assignees.map(
      (assign) => assign.user
    );
    return transportationResp;
  }

  //** Get transportation. Results are paginated. User cursor argument to go forward/backward. */
  async getTransportationWithPagination(
    user: User,
    args: TransportationConnectionArgs
  ): Promise<PaginatedTransportation> {
    const { limit, offset } = getPagingParameters(args);
    const limitPlusOne = limit + 1;
    const { createdById, search, assignedToId, transportType } = args;

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

  //** Create transportation checklist item. */
  async createTransportationChecklistItem(
    user: User,
    transportationId: number,
    description: string,
    type: string
  ) {
    try {
      await this.prisma.transportationChecklistItem.create({
        data: { transportationId, description, type },
      });
      await this.createTransportationHistoryInBackground({
        type: 'Add Checklist',
        description: `Added new checklist`,
        transportationId: transportationId,
        completedById: user.id,
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Edit transportation checklist item. */
  async editTransportationChecklistItem(
    user: User,
    id: number,
    description: string,
    type: string
  ) {
    try {
      const checklist = await this.prisma.transportationChecklistItem.findFirst(
        {
          where: { id },
        }
      );
      if (checklist.description != description) {
        await this.createTransportationHistoryInBackground({
          type: 'Checklist Edit',
          description: `Description changed from ${checklist.description} to ${description}.`,
          transportationId: checklist.transportationId,
          completedById: user.id,
        });
      }
      if (checklist.type != type) {
        await this.createTransportationHistoryInBackground({
          type: 'Checklist Edit',
          description: `Type changed from ${checklist.type} to ${type}.`,
          transportationId: checklist.transportationId,
          completedById: user.id,
        });
      }
      await this.prisma.transportationChecklistItem.update({
        where: { id },
        data: { description, type },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Delete transportation checklist item. */
  async deleteTransportationChecklistItem(user: User, id: number) {
    try {
      const checklist = await this.prisma.transportationChecklistItem.findFirst(
        {
          where: { id },
          select: {
            transportationId: true,
            description: true,
          },
        }
      );
      await this.createTransportationHistoryInBackground({
        type: 'Checklist Delete',
        description: `Checklist (${checklist.description}) deleted.`,
        transportationId: checklist.transportationId,
        completedById: user.id,
      });
      await this.prisma.transportationChecklistItem.delete({
        where: { id },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Set checklist item as complete or incomplete. */
  async toggleTransportationChecklistItem(
    user: User,
    id: number,
    complete: boolean
  ) {
    //no user context yet
    try {
      const checklist = await this.prisma.transportationChecklistItem.findFirst(
        {
          where: { id },
          select: {
            transportationId: true,
            description: true,
          },
        }
      );
      complete
        ? await this.createTransportationHistoryInBackground({
            type: 'Toggled',
            description: `Checklist (${checklist.description}) completed.`,
            transportationId: checklist.transportationId,
            completedById: user.id,
          })
        : await this.createTransportationHistoryInBackground({
            type: 'Toggled',
            description: `Checklist (${checklist.description}) unchecked.`,
            transportationId: checklist.transportationId,
            completedById: user.id,
          });

      await this.prisma.transportationChecklistItem.update({
        where: { id },
        data: complete
          ? { completedById: 1, completedAt: new Date() }
          : { completedById: null, completedAt: null },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Create transport periodic maintenance. */
  async createTransportationPeriodicMaintenance(
    user: User,
    transportationId: number,
    title: string,
    description: string,
    period: number,
    notificationReminder: number
  ) {
    try {
      const periodicMaintenance =
        await this.prisma.transportationPeriodicMaintenance.create({
          data: {
            transportationId,
            title,
            description,
            period,
            notificationReminder,
          },
        });
      await this.createTransportationHistoryInBackground({
        type: 'Add Periodic Maintenance',
        description: `Added periodic maintenance (${periodicMaintenance.id})`,
        transportationId: transportationId,
        completedById: user.id,
      });
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
    description: string,
    period: number,
    notificationReminder: number
  ) {
    try {
      const periodicMaintenance =
        await this.prisma.transportationPeriodicMaintenance.findFirst({
          where: { id },
          select: {
            transportationId: true,
            title: true,
            description: true,
            period: true,
            notificationReminder: true,
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
      if (periodicMaintenance.description != description) {
        await this.createTransportationHistoryInBackground({
          type: 'Periodic Maintenance Edit',
          description: `(${id}) Description changed from ${periodicMaintenance.description} to ${description}.`,
          transportationId: periodicMaintenance.transportationId,
          completedById: user.id,
        });
      }
      if (periodicMaintenance.period != period) {
        await this.createTransportationHistoryInBackground({
          type: 'Periodic Maintenance Edit',
          description: `(${id}) Period changed from ${periodicMaintenance.period} to ${period}.`,
          transportationId: periodicMaintenance.transportationId,
          completedById: user.id,
        });
      }
      if (periodicMaintenance.notificationReminder != notificationReminder) {
        await this.createTransportationHistoryInBackground({
          type: 'Periodic Maintenance Edit',
          description: `(${id}) Notification reminder changed from ${periodicMaintenance.notificationReminder} to ${notificationReminder}.`,
          transportationId: periodicMaintenance.transportationId,
          completedById: user.id,
        });
      }
      await this.prisma.transportationPeriodicMaintenance.update({
        where: { id },
        data: { title, description, period, notificationReminder },
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
            transportationId: true,
            title: true,
          },
        });

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
      await this.prisma.transportationRepair.create({
        data: {
          transportationId,
          title,
          description,
        },
      });
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
    description: string
  ) {
    try {
      const breakdown = await this.prisma.transportationBreakdown.findFirst({
        where: { id },
        select: {
          transportationId: true,
          title: true,
          description: true,
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
      await this.prisma.transportationBreakdown.update({
        where: { id },
        data: { title, description },
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
    const { search, transportationId } = args;

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
      const users = await this.prisma.user.findMany({
        where: {
          id: { in: userIds },
        },
        select: {
          fullName: true,
          rcno: true,
        },
      });
      users.forEach((userData) => {
        this.createTransportationHistoryInBackground({
          type: 'User Assign',
          description: `${userData.fullName} (${userData.rcno}) assigned to transportation.`,
          transportationId: transportationId,
          completedById: user.id,
        });
      });
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
    await this.prisma.transportationHistory.create({
      data: {
        transportationId: transportationHistory.transportationId,
        type: transportationHistory.type,
        description: transportationHistory.description,
        completedById: transportationHistory.completedById,
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
      await this.prisma.transportationAttachment.update({
        where: { id },
        data: { description },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }
}
