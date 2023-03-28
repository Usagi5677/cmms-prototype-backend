import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  getPagingParameters,
  connectionFromArraySlice,
} from 'src/common/pagination/connection-args';
import { User } from 'src/models/user.model';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserAssignmentInput } from './dto/create-user-assignment.input';
import { UpdateUserAssignmentInput } from './dto/update-user-assignment.input';
import { UserAssignmentBulkCreateInput } from './dto/user-assignment-bulk-create.input';
import { UserAssignmentConnectionArgs } from './dto/user-assignment-connection.args';
import { PaginatedUserAssignment } from './dto/user-assignment-connection.model';

@Injectable()
export class UserAssignmentService {
  constructor(private prisma: PrismaService) {}
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
      const { type } = args;
      const where: any = { AND: [{ active: true }] };
      if (type) {
        where.AND.push({ name: { contains: type, mode: 'insensitive' } });
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
  async update({ id, type, userId, locationId }: UpdateUserAssignmentInput) {
    try {
      await this.prisma.userAssignment.update({
        where: { id },
        data: { type, userId, locationId },
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
}
