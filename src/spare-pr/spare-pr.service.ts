import { Injectable, InternalServerErrorException } from '@nestjs/common';
import {
  connectionFromArraySlice,
  getPagingParameters,
} from 'src/common/pagination/connection-args';
import { EntityService } from 'src/entity/entity.service';
import { User } from 'src/models/user.model';
import { RedisCacheService } from 'src/redisCache.service';
import { NotificationService } from 'src/services/notification.service';
import { UserService } from 'src/services/user.service';
import { CreateSparePrInput } from './dto/create-spare-pr.input';
import { SparePRConnectionArgs } from './dto/spare-pr-connection.args';
import { PaginatedSparePR } from './dto/spare-pr-connection.model';
import { UpdateSparePrInput } from './dto/update-spare-pr.input';
import * as moment from 'moment';
import { CreateSparePRDetailInput } from './dto/create-spare-pr-detail.input';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SparePrService {
  constructor(
    private prisma: PrismaService,
    private userService: UserService,
    private readonly redisCacheService: RedisCacheService,
    private entityService: EntityService,
    private notificationService: NotificationService
  ) {}
  async create(
    user: User,
    { entityId, name, requestedDate, details }: CreateSparePrInput
  ) {
    await this.prisma.sparePR.create({
      data: {
        entityId,
        createdById: user.id,
        name,
        requestedDate,
        sparePRDetails: {
          createMany: {
            data: details.map((detail) => ({
              createdById: user.id,
              description: detail,
            })),
          },
        },
      },
    });
    const users = await this.entityService.getEntityAssignmentIds(
      entityId,
      user.id
    );
    for (let index = 0; index < users.length; index++) {
      await this.notificationService.createInBackground({
        userId: users[index],
        body: `${user.fullName} (${user.rcno}) added spare pr.`,
        link: `/entity/${entityId}`,
      });
    }
    await this.entityService.createEntityHistoryInBackground({
      type: `Spare pr added`,
      description: `${user.fullName} (${user.rcno}) added spare pr.`,
      entityId: entityId,
    });
  }

  async findAll(
    user: User,
    args: SparePRConnectionArgs
  ): Promise<PaginatedSparePR> {
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
      const sparePR = await this.prisma.sparePR.findMany({
        skip: offset,
        take: limitPlusOne,
        where,
        include: {
          createdBy: true,
          sparePRDetails: { include: { createdBy: true } },
          entity: true,
        },
        orderBy: { id: 'desc' },
      });

      const count = await this.prisma.sparePR.count({ where });
      const { edges, pageInfo } = connectionFromArraySlice(
        sparePR.slice(0, limit),
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
      const sparePR = await this.prisma.sparePR.findFirst({
        where: { id },
        include: {
          createdBy: true,
        },
        orderBy: { id: 'desc' },
      });
      return sparePR;
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async update(user: User, { id, name, requestedDate }: UpdateSparePrInput) {
    try {
      const before = await this.prisma.sparePR.findFirst({
        where: { id },
      });
      if (name && before.name != name) {
        await this.entityService.createEntityHistoryInBackground({
          type: 'Spare pr Edit',
          description: `Name changed from ${before.name} to ${name}.`,
          entityId: before.entityId,
          completedById: user.id,
        });
      }
      if (
        requestedDate &&
        moment(before.requestedDate).format('DD MMMM YYYY HH:mm:ss') !=
          moment(requestedDate).format('DD MMMM YYYY HH:mm:ss')
      ) {
        await this.entityService.createEntityHistoryInBackground({
          type: 'Spare pr Edit',
          description: `Requested date changed from ${moment(
            before.requestedDate
          ).format('DD MMMM YYYY')} to ${moment(requestedDate).format(
            'DD MMMM YYYY'
          )}.`,
          entityId: before.entityId,
          completedById: user.id,
        });
      }
      await this.prisma.sparePR.update({
        where: { id },
        data: {
          name,
          requestedDate,
        },
      });
      const users = await this.entityService.getEntityAssignmentIds(
        before.entityId,
        user.id
      );
      for (let index = 0; index < users.length; index++) {
        await this.notificationService.createInBackground({
          userId: users[index],
          body: `${user.fullName} (${user.rcno}) updated Spare pr (${id}).`,
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
      const sparePR = await this.prisma.sparePR.delete({ where: { id } });
      const users = await this.entityService.getEntityAssignmentIds(
        sparePR.entityId,
        sparePR.id
      );
      for (let index = 0; index < users.length; index++) {
        await this.notificationService.createInBackground({
          userId: users[index],
          body: `${user.fullName} (${user.rcno}) deleted Spare pr (${id}).`,
          link: `/entity/${sparePR.entityId}`,
        });
      }
      await this.entityService.createEntityHistoryInBackground({
        type: `Spare pr deleted`,
        description: `${user.fullName} (${user.rcno}) deleted Spare pr (${id}).`,
        entityId: sparePR.entityId,
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }
  async addSparePRDetail(
    user: User,
    { sparePRId, description }: CreateSparePRDetailInput
  ) {
    try {
      const entity = await this.prisma.sparePR.findFirst({
        where: { id: sparePRId },
        select: { entityId: true },
      });
      // Check if admin, engineer of entity or has permission
      await this.entityService.checkEntityAssignmentOrPermission(
        entity.entityId,
        user.id,
        undefined,
        ['Admin', 'Engineer'],
        ['MODIFY_SPARE_PR']
      );
      const sparePRDetail = await this.prisma.sparePRDetail.create({
        data: {
          createdById: user.id,
          sparePRId,
          description,
        },
        include: { sparePR: true },
      });
      //if new detail is added, update the completedAt to null
      await this.prisma.sparePR.update({
        where: { id: sparePRId },
        data: { completedAt: null },
      });
      const users = await this.entityService.getEntityAssignmentIds(
        sparePRDetail.sparePR.entityId,
        user.id
      );
      for (let index = 0; index < users.length; index++) {
        await this.notificationService.createInBackground({
          userId: users[index],
          body: `${user.fullName} (${user.rcno}) added spare pr detail in spare pr (${sparePRId}).`,
          link: `/entity/${sparePRDetail.sparePR.entityId}`,
        });
      }
      await this.entityService.createEntityHistoryInBackground({
        type: `Spare pr detail added`,
        description: `${user.fullName} (${user.rcno}) added spare pr detail in spare pr (${sparePRId}).`,
        entityId: sparePRDetail.sparePR.entityId,
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }
  async removeSparePRDetail(user: User, id: number) {
    try {
      const entity = await this.prisma.sparePRDetail.findFirst({
        where: { id },
        include: { sparePR: { select: { entityId: true } } },
      });
      // Check if admin, engineer of entity or has permission
      await this.entityService.checkEntityAssignmentOrPermission(
        entity?.sparePR?.entityId,
        user.id,
        undefined,
        ['Admin', 'Engineer'],
        ['MODIFY_SPARE_PR']
      );
      const sparePRDetail = await this.prisma.sparePRDetail.delete({
        where: { id },
        include: { sparePR: true },
      });
      const users = await this.entityService.getEntityAssignmentIds(
        sparePRDetail.sparePR.entityId,
        user.id
      );
      for (let index = 0; index < users.length; index++) {
        await this.notificationService.createInBackground({
          userId: users[index],
          body: `${user.fullName} (${user.rcno}) deleted spare pr detail (${id}) in spare pr (${sparePRDetail.sparePR.id}).`,
          link: `/entity/${sparePRDetail.sparePR.entityId}`,
        });
      }
      await this.entityService.createEntityHistoryInBackground({
        type: `Spare pr detail deleted`,
        description: `${user.fullName} (${user.rcno}) deleted spare pr detail (${id}) in spare pr (${sparePRDetail.sparePR.id}).`,
        entityId: sparePRDetail.sparePR.entityId,
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  /** toggle completedAt. */
  async toggleSparePRComplete(user: User, id: number, complete: boolean) {
    try {
      const entity = await this.prisma.sparePR.findFirst({
        where: { id },
        select: { entityId: true },
      });
      // Check if admin, engineer of entity or has permission
      await this.entityService.checkEntityAssignmentOrPermission(
        entity?.entityId,
        user.id,
        undefined,
        ['Admin', 'Engineer'],
        ['MODIFY_SPARE_PR']
      );
      const sparePR = await this.prisma.sparePR.update({
        where: { id },
        data: complete ? { completedAt: new Date() } : { completedAt: null },
      });

      const users = await this.entityService.getEntityAssignmentIds(
        sparePR.entityId,
        user.id
      );
      for (let index = 0; index < users.length; index++) {
        await this.notificationService.createInBackground({
          userId: users[index],
          body: `${user.fullName} (${user.rcno})${
            complete ? 'Completed' : 'Incompleted'
          } spare pr (${id}) in entity ${sparePR.entityId}`,
          link: `/entity/${sparePR.entityId}`,
        });
      }
      await this.entityService.createEntityHistoryInBackground({
        type: `Spare pr ${complete ? 'completed' : 'incompleted'} `,
        description: complete
          ? `Spare pr (${id}) has been completed.`
          : `Spare pr (${id}) has been incompleted.`,
        entityId: sparePR.entityId,
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }
}
