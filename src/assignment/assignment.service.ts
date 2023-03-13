import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Prisma, PrismaPromise } from '@prisma/client';
import {
  connectionFromArraySlice,
  getPagingParameters,
} from 'src/common/pagination/connection-args';
import { ENTITY_ASSIGNMENT_TYPES } from 'src/constants';
import { EntityService } from 'src/entity/entity.service';
import { User } from 'src/models/user.model';
import { PrismaService } from 'src/prisma/prisma.service';
import { AssignmentConnectionArgs } from './dto/assignment-connection.args';
import { PaginatedAssignment } from './dto/assignment-connection.model';
import { BulkAssignInput } from './dto/bulk-assign.input';
import { BulkUnassignInput } from './dto/bulk-unassign.input';
import { DivisionAssignmentConnectionArgs } from './dto/division-assignment-connection.args';
import { PaginatedDivisionAssignment } from './dto/division-assignment-connection.model';
import { LocationAssignmentConnectionArgs } from './dto/location-assignment-connection.args';
import { PaginatedLocationAssignment } from './dto/location-assignment-connection.model';

@Injectable()
export class AssignmentService {
  constructor(
    private prisma: PrismaService,
    private readonly entityService: EntityService
  ) {}

  async findAll(args: AssignmentConnectionArgs): Promise<PaginatedAssignment> {
    const { limit, offset } = getPagingParameters(args);
    const limitPlusOne = limit + 1;
    const { entityIds, userIds, current, type } = args;
    const where: any = { AND: [] };
    if (current) {
      where.AND.push({ removedAt: null });
    }
    if (entityIds?.length > 0) {
      where.AND.push({ entityId: { in: entityIds } });
    }
    if (userIds?.length > 0) {
      where.AND.push({ userId: { in: userIds } });
    }
    if (type) {
      where.AND.push({ type });
    }
    const results = await this.prisma.entityAssignment.findMany({
      skip: offset,
      take: limitPlusOne,
      where,
      include: { entity: { include: { location: true } }, user: true },
      orderBy: { updatedAt: 'desc' },
    });
    const count = await this.prisma.entityAssignment.count({ where });
    const { edges, pageInfo } = connectionFromArraySlice(
      results.slice(0, limit),
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

  async bulkAssign(user: User, { entityIds, userIds, type }: BulkAssignInput) {
    if (!ENTITY_ASSIGNMENT_TYPES.includes(type)) {
      throw new BadRequestException('Invalid assignment type.');
    }
    const transactions: PrismaPromise<any>[] = [];
    const notifications = [];
    const histories = [];

    for (const entityId of entityIds) {
      const [assignPromise, entityNotifications, entityHistories] =
        await this.entityService.assignUserToEntityTransactions(
          user,
          entityId,
          type,
          userIds
        );
      if (!assignPromise) {
        continue;
      }
      transactions.push(assignPromise);
      notifications.push(entityNotifications);
      histories.push(entityHistories);
    }

    if (transactions.length === 0) return;

    try {
      await this.prisma.$transaction(transactions);
      await Promise.all(notifications);
      await Promise.all(histories);
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

  async bulkUnassign(
    user: User,
    { entityIds, userIds, type }: BulkUnassignInput
  ) {
    if (!ENTITY_ASSIGNMENT_TYPES.includes(type)) {
      throw new BadRequestException('Invalid assignment type.');
    }
    const transactions: PrismaPromise<any>[] = [];
    const notifications = [];
    const histories = [];

    for (const entityId of entityIds) {
      const [assignPromise, entityNotifications, entityHistories] =
        await this.entityService.unassignUserToEntityTransactions(
          user,
          entityId,
          type,
          userIds
        );
      if (!assignPromise) {
        continue;
      }
      transactions.push(assignPromise);
      notifications.push(entityNotifications);
      histories.push(entityHistories);
    }

    if (transactions.length === 0) return;

    try {
      await this.prisma.$transaction(transactions);
      await Promise.all(notifications);
      await Promise.all(histories);
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

  async divisionAssignments(
    args: DivisionAssignmentConnectionArgs
  ): Promise<PaginatedDivisionAssignment> {
    const { limit, offset } = getPagingParameters(args);
    const limitPlusOne = limit + 1;
    const { userIds, current, divisionIds } = args;
    const where: any = { AND: [] };
    if (current) {
      where.AND.push({ removedAt: null });
    }
    if (userIds?.length > 0) {
      where.AND.push({ userId: { in: userIds } });
    }
    if (divisionIds?.length > 0) {
      where.AND.push({ divisionId: { in: divisionIds } });
    }
    const results = await this.prisma.divisionUsers.findMany({
      skip: offset,
      take: limitPlusOne,
      where,
      include: {
        division: true,
        user: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
    const count = await this.prisma.divisionUsers.count({ where });
    const { edges, pageInfo } = connectionFromArraySlice(
      results.slice(0, limit),
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

  async locationAssignments(
    args: LocationAssignmentConnectionArgs
  ): Promise<PaginatedLocationAssignment> {
    const { limit, offset } = getPagingParameters(args);
    const limitPlusOne = limit + 1;
    const { userIds, current, locationIds, userTypes } = args;
    const where: any = { AND: [] };
    if (current) {
      where.AND.push({ removedAt: null });
    }
    if (userIds?.length > 0) {
      where.AND.push({ userId: { in: userIds } });
    }
    if (locationIds?.length > 0) {
      where.AND.push({ locationId: { in: locationIds } });
    }
    if (userTypes?.length > 0) {
      where.AND.push({ userType: { in: userTypes } });
    }
    const results = await this.prisma.locationUsers.findMany({
      skip: offset,
      take: limitPlusOne,
      where,
      include: {
        location: true,
        user: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
    const count = await this.prisma.locationUsers.count({ where });
    const { edges, pageInfo } = connectionFromArraySlice(
      results.slice(0, limit),
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
