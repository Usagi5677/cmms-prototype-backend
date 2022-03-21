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

@Injectable()
export class MachineService {
  constructor(
    private prisma: PrismaService,
    private userService: UserService,
    private readonly redisCacheService: RedisCacheService,
    private readonly notificationService: NotificationService,
    @Inject(PUB_SUB) private readonly pubSub: RedisPubSub,
    private configService: ConfigService
  ) {}

  //** Create machine. */
  async createMachine(
    user: User,
    machineNumber: string,
    model: string,
    type: string,
    zone: string,
    location: string,
    currentRunningHrs: number,
    lastServiceHrs: number
  ) {
    try {
      await this.prisma.machine.create({
        data: {
          createdById: 1,
          machineNumber,
          model,
          type,
          zone,
          location,
          currentRunningHrs,
          lastServiceHrs,
        },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Delete machine. */
  async deleteMachine(id: number) {
    try {
      await this.prisma.machine.delete({
        where: { id },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Edit machine */
  async editMachine(
    id: number,
    machineNumber: string,
    model: string,
    type: string,
    zone: string,
    location: string,
    currentRunningHrs: number,
    lastServiceHrs: number
  ) {
    try {
      await this.prisma.machine.update({
        data: {
          machineNumber,
          model,
          type,
          zone,
          location,
          currentRunningHrs,
          lastServiceHrs,
        },
        where: { id },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }
}
