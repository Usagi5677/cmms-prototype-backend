import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import {
  connectionFromArraySlice,
  getPagingParameters,
} from 'src/common/pagination/connection-args';
import { EntityService } from 'src/entity/entity.service';
import { User } from 'src/models/user.model';
import { RedisCacheService } from 'src/redisCache.service';
import { NotificationService } from 'src/services/notification.service';
import { UserService } from 'src/services/user.service';
import { BreakdownConnectionArgs } from './dto/breakdown-connection.args';
import { PaginatedBreakdown } from './dto/breakdown-connection.model';
import { CreateBreakdownCommentInput } from './dto/create-breakdown-comment.input';
import { CreateBreakdownDetailInput } from './dto/create-breakdown-detail.input';
import { CreateBreakdownInput } from './dto/create-breakdown.input';
import { UpdateBreakdownInput } from './dto/update-breakdown.input';
import * as moment from 'moment';

@Injectable()
export class BreakdownService {
  constructor(
    private prisma: PrismaService,
    private userService: UserService,
    private readonly redisCacheService: RedisCacheService,
    private entityService: EntityService,
    private notificationService: NotificationService
  ) {}
  async create(
    user: User,
    { entityId, name, type, estimatedDateOfRepair }: CreateBreakdownInput
  ) {
    try {
      await this.prisma.breakdown.create({
        data: {
          entityId,
          createdById: user.id,
          name,
          type,
          estimatedDateOfRepair,
        },
      });
      await this.prisma.entity.update({
        where: { id: entityId },
        data: { status: type, statusChangedAt: new Date() },
      });
      const users = await this.entityService.getEntityAssignmentIds(
        entityId,
        user.id
      );
      for (let index = 0; index < users.length; index++) {
        await this.notificationService.createInBackground({
          userId: users[index],
          body: `${user.fullName} (${user.rcno}) added ${type}.`,
          link: `/entity/${entityId}`,
        });
      }
      await this.entityService.createEntityHistoryInBackground({
        type: `${type} added`,
        description: `${user.fullName} (${user.rcno}) added ${type}.`,
        entityId: entityId,
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async findAll(
    user: User,
    args: BreakdownConnectionArgs
  ): Promise<PaginatedBreakdown> {
    try {
      const { limit, offset } = getPagingParameters(args);
      const limitPlusOne = limit + 1;
      const { entityId, search } = args;

      // eslint-disable-next-line prefer-const
      let where: any = { AND: [] };
      if (entityId) {
        where.AND.push({ entityId });
      }
      //for now these only
      if (search) {
        const or: any = [{ name: { contains: search, mode: 'insensitive' } }];
        // If search contains all numbers, search the machine ids as well
        if (/^(0|[1-9]\d*)$/.test(search)) {
          or.push({ id: parseInt(search) });
        }
        where.AND.push({
          OR: or,
        });
      }
      const breakdown = await this.prisma.breakdown.findMany({
        skip: offset,
        take: limitPlusOne,
        where,
        include: {
          createdBy: true,
          comments: {
            where: { type: 'Observation' },
            include: {
              createdBy: true,
            },
          },
          details: {
            include: {
              createdBy: true,
              comments: {
                include: { createdBy: true },
              },
              repairs: true,
            },
          },
          repairs: {
            include: {
              comments: { include: { createdBy: true } },
              createdBy: true,
              breakdownDetail: true,
            },
          },
        },
        orderBy: { id: 'desc' },
      });

      const count = await this.prisma.breakdown.count({ where });
      const { edges, pageInfo } = connectionFromArraySlice(
        breakdown.slice(0, limit),
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
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async findOne(id: number) {
    try {
      const breakdown = await this.prisma.breakdown.findFirst({
        where: { id },
        include: {
          comments: {
            include: {
              createdBy: true,
            },
            orderBy: { id: 'desc' },
          },
        },
      });
      return breakdown;
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async update(
    user: User,
    { id, entityId, name, type, estimatedDateOfRepair }: UpdateBreakdownInput
  ) {
    try {
      const beforeBreakdown = await this.prisma.breakdown.findFirst({
        where: { id },
      });
      if (name && beforeBreakdown.name != name) {
        await this.entityService.createEntityHistoryInBackground({
          type: 'Breakdown Edit',
          description: `Name changed from ${beforeBreakdown.name} to ${name}.`,
          entityId: entityId,
          completedById: user.id,
        });
      }
      if (type && beforeBreakdown.type != type) {
        await this.entityService.createEntityHistoryInBackground({
          type: 'Breakdown Edit',
          description: `Type changed from ${beforeBreakdown.type} to ${type}.`,
          entityId: entityId,
          completedById: user.id,
        });
      }
      if (
        estimatedDateOfRepair &&
        moment(beforeBreakdown.estimatedDateOfRepair).format(
          'DD MMMM YYYY HH:mm:ss'
        ) != moment(estimatedDateOfRepair).format('DD MMMM YYYY HH:mm:ss')
      ) {
        await this.entityService.createEntityHistoryInBackground({
          type: 'Breakdown Edit',
          description: `Estimated date of repair changed from ${moment(
            beforeBreakdown.estimatedDateOfRepair
          ).format('DD MMMM YYYY')} to ${moment(estimatedDateOfRepair).format(
            'DD MMMM YYYY'
          )}.`,
          entityId: entityId,
          completedById: user.id,
        });
      }
      await this.prisma.breakdown.update({
        where: { id },
        data: {
          entityId,
          name,
          type,
          estimatedDateOfRepair,
        },
      });
      const users = await this.entityService.getEntityAssignmentIds(
        entityId,
        user.id
      );
      for (let index = 0; index < users.length; index++) {
        await this.notificationService.createInBackground({
          userId: users[index],
          body: `${user.fullName} (${user.rcno}) updated ${type} (${id}).`,
          link: `/entity/${entityId}`,
        });
      }
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async remove(user: User, id: number) {
    try {
      const breakdown = await this.prisma.breakdown.delete({ where: { id } });
      const users = await this.entityService.getEntityAssignmentIds(
        breakdown.entityId,
        user.id
      );
      for (let index = 0; index < users.length; index++) {
        await this.notificationService.createInBackground({
          userId: users[index],
          body: `${user.fullName} (${user.rcno}) deleted ${breakdown.type} (${id}).`,
          link: `/entity/${breakdown.entityId}`,
        });
      }
      await this.entityService.createEntityHistoryInBackground({
        type: `${breakdown.type} deleted`,
        description: `${user.fullName} (${user.rcno}) deleted ${breakdown.type} (${id}).`,
        entityId: breakdown.entityId,
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async addBreakdownComment(
    user: User,
    { breakdownId, detailId, type, description }: CreateBreakdownCommentInput
  ) {
    try {
      const breakdown = await this.prisma.breakdownComment.create({
        data: {
          createdById: user.id,
          breakdownId,
          detailId,
          type,
          description,
        },
        include: { breakdown: true },
      });
      const users = await this.entityService.getEntityAssignmentIds(
        breakdown.breakdown.entityId,
        user.id
      );
      for (let index = 0; index < users.length; index++) {
        await this.notificationService.createInBackground({
          userId: users[index],
          body: `${user.fullName} (${user.rcno}) added ${type} in ${breakdown.breakdown.type} (${breakdownId}).`,
          link: `/entity/${breakdown.breakdown.entityId}`,
        });
      }
      await this.entityService.createEntityHistoryInBackground({
        type: `${breakdown.type} added`,
        description: `${user.fullName} (${user.rcno}) added ${type} in ${breakdown.breakdown.type} (${breakdownId}).`,
        entityId: breakdown.breakdown.entityId,
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }
  async removeBreakdownComment(user: User, id: number) {
    try {
      const breakdown = await this.prisma.breakdownComment.delete({
        where: { id },
        include: { breakdown: true },
      });
      const users = await this.entityService.getEntityAssignmentIds(
        breakdown.breakdown.entityId,
        user.id
      );
      for (let index = 0; index < users.length; index++) {
        await this.notificationService.createInBackground({
          userId: users[index],
          body: `${user.fullName} (${user.rcno}) deleted ${breakdown.type} (${id}) in ${breakdown.breakdown.type}.`,
          link: `/entity/${breakdown.breakdown.entityId}`,
        });
      }
      await this.entityService.createEntityHistoryInBackground({
        type: `${breakdown.type} deleted`,
        description: `${user.fullName} (${user.rcno}) deleted ${breakdown.type} (${id}) in ${breakdown.breakdown.type}.`,
        entityId: breakdown.breakdown.entityId,
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async addBreakdownDetail(
    user: User,
    { breakdownId, description }: CreateBreakdownDetailInput
  ) {
    try {
      const breakdown = await this.prisma.breakdownDetail.create({
        data: {
          createdById: user.id,
          breakdownId,
          description,
        },
        include: { breakdown: true },
      });
      //if new detail is added, update the completedAt to null
      await this.prisma.breakdown.update({
        where: { id: breakdownId },
        data: { completedAt: null },
      });
      const users = await this.entityService.getEntityAssignmentIds(
        breakdown.breakdown.entityId,
        user.id
      );
      for (let index = 0; index < users.length; index++) {
        await this.notificationService.createInBackground({
          userId: users[index],
          body: `${user.fullName} (${user.rcno}) added breakdown detail in ${breakdown.breakdown.type} (${breakdownId}).`,
          link: `/entity/${breakdown.breakdown.entityId}`,
        });
      }
      await this.entityService.createEntityHistoryInBackground({
        type: `Breakdown detail added`,
        description: `${user.fullName} (${user.rcno}) added breakdown detail in ${breakdown.breakdown.type} (${breakdownId}).`,
        entityId: breakdown.breakdown.entityId,
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }
  async removeBreakdownDetail(user: User, id: number) {
    try {
      const breakdown = await this.prisma.breakdownDetail.delete({
        where: { id },
        include: { breakdown: true },
      });
      const users = await this.entityService.getEntityAssignmentIds(
        breakdown.breakdown.entityId,
        user.id
      );
      for (let index = 0; index < users.length; index++) {
        await this.notificationService.createInBackground({
          userId: users[index],
          body: `${user.fullName} (${user.rcno}) deleted breakdown detail (${id}) in ${breakdown.breakdown.type} (${breakdown.breakdown.id}).`,
          link: `/entity/${breakdown.breakdown.entityId}`,
        });
      }
      await this.entityService.createEntityHistoryInBackground({
        type: `Breakdown detail deleted`,
        description: `${user.fullName} (${user.rcno}) deleted breakdown detail (${id}) in ${breakdown.breakdown.type} (${breakdown.breakdown.id}).`,
        entityId: breakdown.breakdown.entityId,
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** toggle completedAt. */
  async toggleComplete(user: User, id: number, complete: boolean) {
    try {
      const breakdown = await this.prisma.breakdown.update({
        where: { id },
        data: complete ? { completedAt: new Date() } : { completedAt: null },
      });

      const users = await this.entityService.getEntityAssignmentIds(
        breakdown.entityId,
        user.id
      );
      for (let index = 0; index < users.length; index++) {
        await this.notificationService.createInBackground({
          userId: users[index],
          body: `${user.fullName} (${user.rcno})${
            complete ? 'Completed' : 'Incompleted'
          } breakdown (${id}) in entity ${breakdown.entityId}`,
          link: `/entity/${breakdown.entityId}`,
        });
      }
      await this.entityService.createEntityHistoryInBackground({
        type: `Breakdown ${complete ? 'completed' : 'incompleted'} `,
        description: complete
          ? `Breakdown (${id}) has been completed.`
          : `Breakdown (${id}) has been incompleted.`,
        entityId: breakdown.entityId,
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }
}
