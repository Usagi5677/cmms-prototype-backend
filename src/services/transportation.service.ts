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
}
