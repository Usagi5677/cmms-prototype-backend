import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';
import {
  connectionFromArraySlice,
  getPagingParameters,
} from 'src/common/pagination/connection-args';
import { User } from 'src/models/user.model';
import { CreateLocationInput } from './dto/create-location.input';
import { LocationConnectionArgs } from './dto/location-connection.args';
import { PaginatedLocation } from './dto/location-connection.model';
import { LocationAssignInput } from './dto/location-assign.input';
import { UpdateLocationInput } from './dto/update-location.input';

@Injectable()
export class LocationService {
  constructor(private prisma: PrismaService) {}

  async create(user: User, { name, zoneId, skipFriday }: CreateLocationInput) {
    const existing = await this.prisma.location.findFirst({
      where: { name, active: true },
    });
    if (existing) {
      throw new BadRequestException(`${name} already exists.`);
    }
    await this.prisma.location.create({
      data: { name, zoneId, createdById: user.id, skipFriday },
    });
  }

  async findAll(args: LocationConnectionArgs): Promise<PaginatedLocation> {
    const { limit, offset } = getPagingParameters(args);
    const limitPlusOne = limit + 1;
    const { name, zoneId, showOnlyUnzoned, withSkipFriday } = args;
    const where: any = { AND: [{ active: true }] };
    if (name) {
      where.AND.push({ name: { contains: name, mode: 'insensitive' } });
    }
    if (zoneId) {
      where.AND.push({ zoneId });
    } else if (showOnlyUnzoned) {
      where.AND.push({ zoneId: null });
    }
    if (withSkipFriday) {
      where.AND.push({
        skipFriday: true,
      });
    }
    const locations = await this.prisma.location.findMany({
      skip: offset,
      take: limitPlusOne,
      where,
      orderBy: { name: 'asc' },
      include: { zone: true },
    });
    const count = await this.prisma.location.count({ where });
    const { edges, pageInfo } = connectionFromArraySlice(
      locations.slice(0, limit),
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

  async findEvery() {
    return await this.prisma.location.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: number) {
    const location = await this.prisma.location.findFirst({ where: { id } });
    if (!location) {
      throw new BadRequestException('Invalid location.');
    }
    return location;
  }

  async update({ id, name, zoneId, skipFriday }: UpdateLocationInput) {
    await this.prisma.location.update({
      where: { id },
      data: { name, zoneId: zoneId ?? null, skipFriday },
    });
  }

  async remove(id: number) {
    await this.prisma.location.update({
      where: { id },
      data: { active: false },
    });
  }

  async unassignUserFromLocation(id: number) {
    await this.prisma.locationUsers.update({
      where: { id },
      data: { removedAt: new Date() },
    });
  }

  async assignEntityToLocation({ locationId, entityIds }: LocationAssignInput) {
    try {
      if (entityIds.length > 0) {
        for (const id of entityIds) {
          await this.prisma.entity.update({
            where: { id },
            data: { locationId },
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

  async assignUserToLocation({ locationId, userIds }: LocationAssignInput) {
    try {
      if (userIds.length > 0) {
        await this.prisma.locationUsers.updateMany({
          where: { userId: { in: userIds }, locationId },
          data: { removedAt: new Date() },
        });
        await this.prisma.locationUsers.createMany({
          data: userIds.map((userId) => ({
            locationId,
            userId,
          })),
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
        throw new InternalServerErrorException('Unexpected error occured.');
      }
    }
  }

  async updateEntityLocation(entityId: number, locationId: number) {
    await this.prisma.entity.update({
      where: { id: entityId },
      data: { locationId },
    });
  }
}
