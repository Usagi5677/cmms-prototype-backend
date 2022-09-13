import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Prisma, PrismaPromise } from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';
import {
  connectionFromArraySlice,
  getPagingParameters,
} from 'src/common/pagination/connection-args';
import { ENTITY_ASSIGNMENT_TYPES } from 'src/constants';
import { EntityService } from 'src/entity/entity.service';
import { User } from 'src/models/user.model';
import { AssignmentConnectionArgs } from './dto/assignment-connection.args';
import { PaginatedAssignment } from './dto/assignment-connection.model';
import { BulkAssignInput } from './dto/bulk-assign.input';

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
}
