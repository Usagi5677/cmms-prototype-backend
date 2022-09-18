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
import { CreateRepairCommentInput } from './dto/create-repair-comment.input';
import { CreateRepairInput } from './dto/create-repair.input';
import { RepairConnectionArgs } from './dto/repair-connection.args';
import { PaginatedRepair } from './dto/repair-connection.model';
import { UpdateRepairInput } from './dto/update-repair.input';

@Injectable()
export class RepairService {
  constructor(
    private prisma: PrismaService,
    private userService: UserService,
    private readonly redisCacheService: RedisCacheService,
    private entityService: EntityService,
    private notificationService: NotificationService
  ) {}
  async create(user: User, { entityId, breakdownId, name }: CreateRepairInput) {
    try {
      const repair = await this.prisma.repair.create({
        data: {
          entityId,
          createdById: user.id,
          breakdownId,
          name,
        },
        include: { breakdown: true },
      });
      if (breakdownId) {
        await this.prisma.breakdown.update({
          where: { id: breakdownId },
          data: { completedAt: new Date() },
        });
      }
      const users = await this.entityService.getEntityAssignmentIds(
        entityId,
        user.id
      );
      for (let index = 0; index < users.length; index++) {
        await this.notificationService.createInBackground({
          userId: users[index],
          body: breakdownId
            ? `Breakdown completed. ${user.fullName} (${user.rcno}) added repair in ${repair.breakdown.type} (${breakdownId}).`
            : `${user.fullName} (${user.rcno}) added repair.`,
          link: `/entity/${entityId}`,
        });
      }
      await this.entityService.createEntityHistoryInBackground({
        type: `Repair added`,
        description: `${user.fullName} (${user.rcno}) added repair.`,
        entityId: entityId,
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async findAll(
    user: User,
    args: RepairConnectionArgs
  ): Promise<PaginatedRepair> {
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
      const repair = await this.prisma.repair.findMany({
        skip: offset,
        take: limitPlusOne,
        where,
        include: {
          breakdown: {
            include: {
              createdBy: true,
            },
          },
          createdBy: true,
          comments: { include: { createdBy: true } },
        },
        orderBy: { id: 'desc' },
      });

      const count = await this.prisma.repair.count({ where });
      const { edges, pageInfo } = connectionFromArraySlice(
        repair.slice(0, limit),
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
      const repair = await this.prisma.repair.findFirst({
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
      return repair;
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async update(user: User, { id, name }: UpdateRepairInput) {
    try {
      const before = await this.prisma.repair.findFirst({
        where: { id },
      });
      if (name && before.name != name) {
        await this.entityService.createEntityHistoryInBackground({
          type: 'Repair Edit',
          description: `Name changed from ${before.name} to ${name}.`,
          entityId: before.entityId,
          completedById: user.id,
        });
      }
      await this.prisma.repair.update({
        where: { id },
        data: {
          name,
        },
      });
      const users = await this.entityService.getEntityAssignmentIds(
        before.entityId,
        user.id
      );
      for (let index = 0; index < users.length; index++) {
        await this.notificationService.createInBackground({
          userId: users[index],
          body: `${user.fullName} (${user.rcno}) updated Repair (${id}).`,
          link: `/entity/${before.entityId}`,
        });
      }
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async remove(user: User, id: number) {
    try {
      const repair = await this.prisma.repair.delete({ where: { id } });
      //if all repairs get deleted then update breakdown's completedAt to null
      const otherRepairsExist = await this.prisma.breakdown.findFirst({
        where: { id: repair.breakdownId },
        include: { repairs: true },
      });
      if (otherRepairsExist.repairs.length <= 0) {
        await this.prisma.breakdown.update({
          where: { id: repair.breakdownId },
          data: { completedAt: null },
        });
      }

      const users = await this.entityService.getEntityAssignmentIds(
        repair.entityId,
        user.id
      );
      for (let index = 0; index < users.length; index++) {
        await this.notificationService.createInBackground({
          userId: users[index],
          body: `${user.fullName} (${user.rcno}) deleted Repair (${id}).`,
          link: `/entity/${repair.entityId}`,
        });
      }
      await this.entityService.createEntityHistoryInBackground({
        type: `Repair deleted`,
        description: `${user.fullName} (${user.rcno}) deleted Repair (${id}).`,
        entityId: repair.entityId,
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async addRepairComment(
    user: User,
    { repairId, type, description }: CreateRepairCommentInput
  ) {
    try {
      const repair = await this.prisma.repairComment.create({
        data: {
          createdById: user.id,
          repairId,
          type,
          description,
        },
        include: { repair: true },
      });
      const users = await this.entityService.getEntityAssignmentIds(
        repair.repair.entityId,
        user.id
      );
      for (let index = 0; index < users.length; index++) {
        await this.notificationService.createInBackground({
          userId: users[index],
          body: `${user.fullName} (${user.rcno}) added ${type} in Repair (${repairId}).`,
          link: `/entity/${repair.repair.entityId}`,
        });
      }
      await this.entityService.createEntityHistoryInBackground({
        type: `${type} added`,
        description: `${user.fullName} (${user.rcno}) added ${type} in Repair (${repairId}).`,
        entityId: repair.repair.entityId,
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }
  async removeRepairComment(user: User, id: number) {
    try {
      const repair = await this.prisma.repairComment.delete({
        where: { id },
        include: { repair: true },
      });
      const users = await this.entityService.getEntityAssignmentIds(
        repair.repair.entityId,
        user.id
      );
      for (let index = 0; index < users.length; index++) {
        await this.notificationService.createInBackground({
          userId: users[index],
          body: `${user.fullName} (${user.rcno}) deleted ${repair.type} (${repair.id}) in Repair (${repair.repair.id}).`,
          link: `/entity/${repair.repair.entityId}`,
        });
      }
      await this.entityService.createEntityHistoryInBackground({
        type: `${repair.type} deleted`,
        description: `${user.fullName} (${user.rcno}) deleted ${repair.type} (${repair.id}) in Repair (${repair.repair.id}).`,
        entityId: repair.repair.entityId,
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }
}
