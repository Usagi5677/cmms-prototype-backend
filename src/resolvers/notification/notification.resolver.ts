import {
  Args,
  Int,
  Mutation,
  Query,
  Resolver,
  Subscription,
} from '@nestjs/graphql';
import { Notification } from '../../models/notification.model';
import { PrismaService } from '../../prisma/prisma.service';
import { UserEntity } from '../../decorators/user.decorator';
import { User } from '../../models/user.model';
import { Inject, UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../../guards/gql-auth.guard';
import { NotificationService } from 'src/services/notification.service';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { PUB_SUB } from 'src/resolvers/pubsub/pubsub.module';

@Resolver(() => Notification)
export class NotificationResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    @Inject(PUB_SUB) private readonly pubSub: RedisPubSub
  ) {}

  @UseGuards(GqlAuthGuard)
  @Query(() => [Notification])
  async notifications(@UserEntity() user: User) {
    return await this.prisma.notification.findMany({
      take: 15,
      where: { userId: user.id, readAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  @UseGuards(GqlAuthGuard)
  @Mutation(() => Boolean)
  async readAllNotifications(@UserEntity() user: User) {
    await this.prisma.$queryRaw`
    UPDATE "Notification" N
    SET "readAt" = now()
    WHERE N."userId" = ${user.id} AND N."readAt" IS NULL`;
    return true;
  }

  @UseGuards(GqlAuthGuard)
  @Mutation(() => String)
  async readNotification(@Args('notificationId') notificationId: number) {
    try {
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: { readAt: new Date() },
      });
    } catch (e) {
      console.log(e);
    }
    return `Successfully read notification`;
  }

  @Subscription(() => Notification, {
    filter: (payload, variables) => {
      return payload.notificationCreated.userId === variables.userId;
    },
    async resolve(this: any, payload: { notificationCreated: Notification }) {
      return payload.notificationCreated;
    },
  })
  async notificationCreated(@Args('userId') userId: number) {
    return this.pubSub.asyncIterator('notificationCreated');
  }
}
