import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  connectionFromArraySlice,
  getPagingParameters,
} from 'src/common/pagination/connection-args';
import { User } from 'src/models/user.model';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationService } from 'src/services/notification.service';
import { CreateDivisionInput } from './dto/create-division.input';
import { DivisionAssignInput } from './dto/division-assign.input';
import { DivisionConnectionArgs } from './dto/division-connection.args';
import { PaginatedDivision } from './dto/division-connection.model';
import { UpdateDivisionInput } from './dto/update-division.input';

@Injectable()
export class DivisionService {
  constructor(
    private prisma: PrismaService,
    private readonly notificationService: NotificationService
  ) {}

  async create(user: User, { name }: CreateDivisionInput) {
    const existing = await this.prisma.division.findFirst({
      where: { name, active: true },
    });
    if (existing) {
      throw new BadRequestException(`${name} already exists.`);
    }
    await this.prisma.division.create({ data: { name, createdById: user.id } });
  }

  async findAll(args: DivisionConnectionArgs): Promise<PaginatedDivision> {
    const { limit, offset } = getPagingParameters(args);
    const limitPlusOne = limit + 1;
    const { name } = args;
    const where: any = { AND: [{ active: true }] };
    if (name) {
      where.AND.push({ name: { contains: name, mode: 'insensitive' } });
    }
    const divisions = await this.prisma.division.findMany({
      skip: offset,
      take: limitPlusOne,
      where,
      include: {
        assignees: {
          include: { user: true },
        },
      },
      orderBy: { name: 'asc' },
    });
    const count = await this.prisma.division.count({ where });
    const { edges, pageInfo } = connectionFromArraySlice(
      divisions.slice(0, limit),
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

  async findOne(id: number) {
    const division = await this.prisma.division.findFirst({ where: { id } });
    if (!division) {
      throw new BadRequestException('Invalid division.');
    }
    return division;
  }

  async update({ id, name }: UpdateDivisionInput) {
    await this.prisma.division.update({ where: { id }, data: { name } });
  }

  async remove(id: number) {
    await this.prisma.division.update({
      where: { id },
      data: { active: false },
    });
  }

  async assignUserToDivision(
    user: User,
    { divisionId, userIds }: DivisionAssignInput
  ) {
    try {
      if (userIds.length > 0) {
        const assignedUsers = await this.prisma.divisionUsers.findMany({
          where: { userId: { in: userIds }, divisionId, removedAt: null },
        });
        const assignedUserIds = assignedUsers?.map((u) => u?.userId);
        const newIds = userIds.filter((id) => !assignedUserIds?.includes(id));
        await this.prisma.divisionUsers.updateMany({
          where: { userId: { in: newIds }, divisionId },
          data: { removedAt: new Date() },
        });
        await this.prisma.divisionUsers.createMany({
          data: newIds.map((userId) => ({
            divisionId,
            userId,
          })),
        });

        const userIdsExceptCurrentUser = newIds.filter((id) => id != user.id);

        const division = await this.prisma.division.findFirst({
          where: { id: divisionId },
          select: { name: true },
        });

        for (const id of userIdsExceptCurrentUser) {
          this.notificationService.createInBackground({
            userId: id,
            body: `${user.fullName} (${user.rcno}) assigned you to division ${division?.name}`,
          });
        }
      }
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        // This error throws if user is already assigned to entity
        // Catch and ignore this error and proceed
      } else {
        console.log(e);
        throw new InternalServerErrorException('Unexpected error occured.');
      }
    }
  }

  async bulkUnassignUserFromDivision(
    user: User,
    { divisionId, userIds }: DivisionAssignInput
  ) {
    try {
      if (userIds.length > 0) {
        await this.prisma.divisionUsers.updateMany({
          where: { userId: { in: userIds }, divisionId },
          data: { removedAt: new Date() },
        });
        const userIdsExceptCurrentUser = userIds.filter((id) => id != user.id);

        const division = await this.prisma.division.findFirst({
          where: { id: divisionId },
          select: { name: true },
        });

        for (const id of userIdsExceptCurrentUser) {
          this.notificationService.createInBackground({
            userId: id,
            body: `${user.fullName} (${user.rcno}) removed you from division ${division?.name}`,
          });
        }
      }
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        // This error throws if user is already assigned to entity
        // Catch and ignore this error and proceed
      } else {
        console.log(e);
        throw new InternalServerErrorException('Unexpected error occured.');
      }
    }
  }

  async search(query?: string, limit?: number) {
    if (!limit) limit = 10;
    // eslint-disable-next-line prefer-const
    let where: any = { AND: [] };

    where.AND.push({
      active: true,
    });
    if (query) {
      where.AND.push({
        name: { contains: query, mode: 'insensitive' },
      });
    }

    const divisions = await this.prisma.division.findMany({
      where,
      take: limit,
    });
    return divisions;
  }

  async unassignUserFromDivision(id: number) {
    await this.prisma.divisionUsers.update({
      where: { id },
      data: { removedAt: new Date() },
    });
  }

  async updateEntityDivision(entityId: number, divisionId: number) {
    await this.prisma.entity.update({
      where: { id: entityId },
      data: { divisionId },
    });
  }

  async assignEntityToDivision({ divisionId, entityIds }: DivisionAssignInput) {
    try {
      if (entityIds.length > 0) {
        for (const id of entityIds) {
          await this.prisma.entity.update({
            where: { id },
            data: { divisionId },
          });
        }
      }
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        // This error throws if user is already assigned to entity
        // Catch and ignore this error and proceed
      } else {
        console.log(e);
        throw new InternalServerErrorException('Unexpected error occured.');
      }
    }
  }
}
