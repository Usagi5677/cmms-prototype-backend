import { InjectQueue } from '@nestjs/bull';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Queue } from 'bull';
import {
  getPagingParameters,
  connectionFromArraySlice,
} from 'src/common/pagination/connection-args';
import { User } from 'src/models/user.model';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationService } from 'src/services/notification.service';
import { CreateUserAssignmentInput } from './dto/create-user-assignment.input';
import { UpdateUserAssignmentInput } from './dto/update-user-assignment.input';
import { UserAssignmentBulkCreateInput } from './dto/user-assignment-bulk-create.input';
import { UserAssignmentConnectionArgs } from './dto/user-assignment-connection.args';
import { PaginatedUserAssignment } from './dto/user-assignment-connection.model';

export interface autoAssignUsersInterface {
  userId: number;
  divisionIds?: number[];
  locationId?: number;
  zoneId?: number;
  types: string[];
  entityIds: number[];
  description: string;
}

@Injectable()
export class UserAssignmentService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('cmms-user-assignment-queue')
    private userAssignmentQueue: Queue,
    private notificationService: NotificationService
  ) {}
  async create(
    user: User,
    { type, userId, locationId, zoneId }: CreateUserAssignmentInput
  ) {
    try {
      const existing = await this.prisma.userAssignment.findFirst({
        where: { type, userId, locationId, zoneId, active: true },
      });
      if (existing) {
        throw new BadRequestException('This user assignment already exists.');
      }
      await this.prisma.userAssignment.create({
        data: { type, userId, locationId, zoneId, createdById: user.id },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }
  async findAll(
    args: UserAssignmentConnectionArgs
  ): Promise<PaginatedUserAssignment> {
    try {
      const { limit, offset } = getPagingParameters(args);
      const limitPlusOne = limit + 1;
      const { types, zoneIds, locationIds, userIds, search } = args;
      const where: any = { AND: [{ active: true }] };
      if (search) {
        const or: any = [
          { user: { fullName: { contains: search, mode: 'insensitive' } } },
        ];
        // If search contains all numbers, search the rcno as well
        if (/^(0|[1-9]\d*)$/.test(search)) {
          or.push({ user: { rcno: parseInt(search) } });
        }
        where.AND.push({
          OR: or,
        });
      }
      if (types?.length > 0) {
        where.AND.push({ type: { in: types } });
      }
      if (locationIds?.length > 0) {
        where.AND.push({ locationId: { in: locationIds } });
      }
      if (zoneIds?.length > 0) {
        where.AND.push({ zoneId: { in: zoneIds } });
      }
      if (userIds?.length > 0) {
        where.AND.push({ userId: { in: userIds } });
      }
      const userAssignments = await this.prisma.userAssignment.findMany({
        skip: offset,
        take: limitPlusOne,
        where,
        include: {
          user: { include: { divisionUsers: { include: { division: true } } } },
          location: true,
          zone: true,
        },
      });
      const count = await this.prisma.userAssignment.count({ where });
      const { edges, pageInfo } = connectionFromArraySlice(
        userAssignments.slice(0, limit),
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
      throw new InternalServerErrorException('Error loading user assignments.');
    }
  }

  async findOne(id: number) {
    try {
      const userAssignment = await this.prisma.userAssignment.findFirst({
        where: { id },
      });
      if (!userAssignment) {
        throw new BadRequestException('Invalid user assignment.');
      }
      return userAssignment;
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occurred.');
    }
  }
  async update({
    id,
    type,
    userId,
    locationId,
    zoneId,
  }: UpdateUserAssignmentInput) {
    try {
      await this.prisma.userAssignment.update({
        where: { id },
        data: { type, userId, locationId, zoneId },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException(
        'Unexpected error occurred while updating user assignment.'
      );
    }
  }
  async remove(id: number) {
    try {
      await this.prisma.userAssignment.update({
        where: { id },
        data: { active: false },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException(
        'Unexpected error occurred while removing.'
      );
    }
  }

  async bulkCreate(
    user: User,
    { locationIds, userIds, type, zoneId }: UserAssignmentBulkCreateInput
  ) {
    try {
      if (userIds.length) {
        await this.prisma.userAssignment.updateMany({
          where: {
            userId: { in: userIds },
            locationId: { in: locationIds },
            type,
            zoneId,
            active: true,
          },
          data: { active: false },
        });
        const data = [];
        for (const userId of userIds) {
          if (locationIds.length > 0) {
            for (const loc of locationIds) {
              data.push({
                createdById: user?.id,
                userId,
                locationId: loc,
                zoneId,
                type,
              });
            }
          } else {
            data.push({
              createdById: user?.id,
              userId,
              zoneId,
              type,
            });
          }
        }
        await this.prisma.userAssignment.createMany({
          data,
        });
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
        throw new InternalServerErrorException(
          'Unexpected error occured while bulk creating.'
        );
      }
    }
  }
  async bulkRemove(
    user: User,
    { locationIds, userIds, type, zoneId }: UserAssignmentBulkCreateInput
  ) {
    try {
      if (userIds.length) {
        // eslint-disable-next-line prefer-const
        let where: any = {};
        where.userId = { in: userIds };
        where.locationId = null;
        where.type = type;
        where.zoneId = null;
        where.active = true;
        if (locationIds?.length > 0) {
          where.locationId = { in: locationIds };
        }
        if (zoneId) {
          where.zoneId = zoneId;
        }
        await this.prisma.userAssignment.updateMany({
          where,
          data: { active: false },
        });
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
        throw new InternalServerErrorException(
          'Unexpected error occured while bulk removing.'
        );
      }
    }
  }

  //** auto assign users in background */
  async autoAssignUsersInBackground(autoAssignUsers: autoAssignUsersInterface) {
    try {
      await this.userAssignmentQueue.add('autoAssignUsers', {
        autoAssignUsers,
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException(
        'Unexpected error occured while auto assigning users in background.'
      );
    }
  }

  async autoAssignUsers({
    userId,
    divisionIds,
    locationId,
    zoneId,
    types,
    entityIds,
    description,
  }: autoAssignUsersInterface) {
    try {
      //get all users from user assignments
      const userAssignments = await this.prisma.userAssignment.findMany({
        where: {
          user: {
            divisionUsers: { some: { divisionId: { in: divisionIds } } },
          },
          type: { in: types },
          active: true,
          locationId,
          zoneId,
        },
        distinct: ['userId'],
        orderBy: { id: 'desc' },
      });

      //remove previous type assignments of entity
      if (userAssignments?.length > 0) {
        await this.prisma.entityAssignment.updateMany({
          where: {
            type: { in: types },
            entityId: { in: entityIds },
            removedAt: null,
          },
          data: { removedAt: new Date() },
        });

        //insert new users and notify them
        for (const entityId of entityIds) {
          for (const userAssignment of userAssignments) {
            await this.prisma.entityAssignment.create({
              data: {
                entityId,
                userId: userAssignment?.userId,
                type: userAssignment?.type,
              },
            });
            if (userId !== userAssignment?.userId) {
              await this.notificationService.createInBackground({
                userId: userAssignment?.userId,
                body: `${description} and you have been assigned as the ${userAssignment?.type} for Entity (${entityId})`,
              });
            }
          }
        }
      }
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException(
        'Unexpected error occured while auto assigning users.'
      );
    }
  }
}
