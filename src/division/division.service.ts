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
import {
  autoAssignUsersInterface,
  UserAssignmentService,
} from 'src/user-assignment/user-assignment.service';
import { CreateDivisionInput } from './dto/create-division.input';
import { DivisionAssignInput } from './dto/division-assign.input';
import { DivisionConnectionArgs } from './dto/division-connection.args';
import { PaginatedDivision } from './dto/division-connection.model';
import { UpdateDivisionInput } from './dto/update-division.input';

@Injectable()
export class DivisionService {
  constructor(
    private prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private userAssignmentService: UserAssignmentService
  ) {}

  async create(user: User, { name }: CreateDivisionInput) {
    try {
      const existing = await this.prisma.division.findFirst({
        where: { name, active: true },
      });
      if (existing) {
        throw new BadRequestException(`${name} already exists.`);
      }
      await this.prisma.division.create({
        data: { name, createdById: user.id },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async findAll(args: DivisionConnectionArgs): Promise<PaginatedDivision> {
    try {
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
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async findOne(id: number) {
    try {
      const division = await this.prisma.division.findFirst({ where: { id } });
      if (!division) {
        throw new BadRequestException('Invalid division.');
      }
      return division;
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
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
        const entities = await this.prisma.entity.findMany({
          where: { divisionId, deletedAt: null },
        });
        const entityIds = entities.map((e) => e.id);
        //auto user assign queue
        const autoAssign: autoAssignUsersInterface = {
          userId: user?.id,
          divisionIds: [divisionId],
          types: ['Admin'],
          entityIds,
          description: `Your division has been changed to ${division?.name}`,
        };
        await this.userAssignmentService.autoAssignUsersInBackground(
          autoAssign
        );

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
        const entities = await this.prisma.entity.findMany({
          where: { divisionId, deletedAt: null },
        });
        const entityIds = entities.map((e) => e.id);
        //auto user assign queue
        const autoAssign: autoAssignUsersInterface = {
          userId: user?.id,
          divisionIds: [divisionId],
          types: ['Admin'],
          entityIds,
          description: `You have been removed from ${division?.name}`,
        };
        await this.userAssignmentService.autoAssignUsersInBackground(
          autoAssign
        );
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
    try {
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
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async unassignUserFromDivision(user: User, id: number) {
    try {
      const division = await this.prisma.divisionUsers.update({
        where: { id },
        data: { removedAt: new Date() },
        include: { division: true },
      });
      const entities = await this.prisma.entity.findMany({
        where: { divisionId: id, deletedAt: null },
      });
      const entityIds = entities.map((e) => e.id);
      //auto user assign queue
      const autoAssign: autoAssignUsersInterface = {
        userId: user?.id,
        divisionIds: [division?.divisionId],
        types: ['Admin'],
        entityIds,
        description: `You have been removed from ${division?.division?.name}`,
      };
      await this.userAssignmentService.autoAssignUsersInBackground(autoAssign);
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async updateEntityDivision(user: User, entityId: number, divisionId: number) {
    try {
      await this.prisma.entity.update({
        where: { id: entityId },
        data: { divisionId },
      });
      //auto user assign queue
      const autoAssign: autoAssignUsersInterface = {
        userId: user?.id,
        divisionIds: [divisionId],
        types: ['Admin'],
        entityIds: [entityId],
        description: `Entity (${entityId}) Division changed`,
      };
      await this.userAssignmentService.autoAssignUsersInBackground(autoAssign);
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async assignEntityToDivision(
    user: User,
    { divisionId, entityIds }: DivisionAssignInput
  ) {
    try {
      if (entityIds.length > 0) {
        await this.prisma.entity.updateMany({
          where: { id: { in: entityIds } },
          data: { divisionId },
        });
        const division = await this.prisma.division.findFirst({
          where: { id: divisionId },
          select: { name: true },
        });
        //auto user assign queue
        const autoAssign: autoAssignUsersInterface = {
          userId: user?.id,
          divisionIds: [divisionId],
          types: ['Admin'],
          entityIds,
          description: `Your division has been changed to ${division?.name}`,
        };
        await this.userAssignmentService.autoAssignUsersInBackground(
          autoAssign
        );
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
