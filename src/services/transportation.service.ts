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

@Injectable()
export class TransportationService {
  constructor(
    private prisma: PrismaService,
    private userService: UserService,
    private readonly redisCacheService: RedisCacheService,
    private readonly notificationService: NotificationService,
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
      await this.prisma.transportation.create({
        data: {
          createdById: 1,
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

  // Get transportation details
  async getSingleTransportation(user: User, transportationId: number) {
    const transportation = await this.prisma.transportation.findFirst({
      where: { id: transportationId },
      include: {
        createdBy: true,
        checklistItems: true,
      },
    });
    if (!transportation)
      throw new BadRequestException('Transportation not found.');

    // Assigning data from db to the gql shape as it does not match 1:1
    return transportation;
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
      await this.prisma.transportationPeriodicMaintenance.create({
        data: {
          transportationId,
          title,
          description,
          period,
          notificationReminder,
        },
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
      //put condition for status done later
      await this.prisma.transportationPeriodicMaintenance.update({
        where: { id },
        data: { status },
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
      //put condition for status done later
      await this.prisma.transportationRepair.update({
        where: { id },
        data: { status },
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
      await this.prisma.transportationSparePR.create({
        data: {
          transportationId,
          requestedDate,
          title,
          description,
        },
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
      //put condition for status done later
      await this.prisma.transportationSparePR.update({
        where: { id },
        data: { status },
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
      await this.prisma.transportationBreakdown.create({
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

  //** Edit transportation breakdown. */
  async editTransportationBreakdown(
    user: User,
    id: number,
    title: string,
    description: string
  ) {
    try {
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
      //put condition for status done later
      await this.prisma.transportationBreakdown.update({
        where: { id },
        data: { status },
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
    // Check for roles later

    try {
      await this.prisma.transportationAssignment.createMany({
        data: userIds.map((userId, index) => ({
          transportationId,
          userId: userId,
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
}
