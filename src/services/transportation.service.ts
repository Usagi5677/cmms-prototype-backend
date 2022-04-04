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
import emailTemplate from 'src/common/helpers/emailTemplate';
import { ConfigService } from '@nestjs/config';
import { PaginatedTransportation } from 'src/models/pagination/transportation-connection.model';
import { TransportationConnectionArgs } from 'src/models/args/transportation-connection.args';
import { PeriodicMaintenanceStatus } from 'src/common/enums/periodicMaintenanceStatus';
import { RepairStatus } from 'src/common/enums/repairStatus';
import { SparePRStatus } from 'src/common/enums/sparePRStatus';
import { BreakdownStatus } from 'src/common/enums/breakdownStatus';

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
    lastServiceMileage: number
  ) {
    try {
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
    lastServiceMileage: number
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
        },
        where: { id },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Get transportation. Results are paginated. User cursor argument to go forward/backward. */
  async getTransportationWithPagination(
    user: User,
    args: TransportationConnectionArgs
  ): Promise<PaginatedTransportation> {
    const { limit, offset } = getPagingParameters(args);
    const limitPlusOne = limit + 1;
    const { createdById, search } = args;

    // eslint-disable-next-line prefer-const
    let where: any = { AND: [] };
    if (createdById) {
      where.AND.push({ createdById });
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
    period: Date,
    notificationReminder: Date
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
    description: string
  ) {
    try {
      await this.prisma.transportationPeriodicMaintenance.update({
        where: { id },
        data: { title, description },
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

  //** Set transport periodic maintenance period. */
  async setTransportationPeriodicMaintenancePeriod(
    user: User,
    id: number,
    period: Date
  ) {
    try {
      await this.prisma.transportationPeriodicMaintenance.update({
        where: { id },
        data: { period },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Set transport periodic maintenance period. */
  async setTransportationPeriodicMaintenanceNotificationReminder(
    user: User,
    id: number,
    notificationReminder: Date
  ) {
    try {
      await this.prisma.transportationPeriodicMaintenance.update({
        where: { id },
        data: { notificationReminder },
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
}
