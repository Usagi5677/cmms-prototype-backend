import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
import { NotificationService } from 'src/services/notification.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { EntityService } from 'src/entity/entity.service';
import * as moment from 'moment';

@Injectable()
export class LocationService {
  constructor(
    private prisma: PrismaService,
    private readonly notificationService: NotificationService,
    @Inject(forwardRef(() => EntityService))
    private entityService: EntityService
  ) {}

  async create(user: User, { name, zoneId, skipFriday }: CreateLocationInput) {
    try {
      const existing = await this.prisma.location.findFirst({
        where: { name, active: true },
      });
      if (existing) {
        throw new BadRequestException(`${name} already exists.`);
      }
      await this.prisma.location.create({
        data: { name, zoneId, createdById: user.id, skipFriday },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async findAll(args: LocationConnectionArgs): Promise<PaginatedLocation> {
    try {
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
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async findEvery() {
    try {
      return await this.prisma.location.findMany({
        where: { active: true },
        orderBy: { name: 'asc' },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async findOne(id: number) {
    try {
      const location = await this.prisma.location.findFirst({ where: { id } });
      if (!location) {
        throw new BadRequestException('Invalid location.');
      }
      return location;
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async update({ id, name, zoneId, skipFriday }: UpdateLocationInput) {
    try {
      await this.prisma.location.update({
        where: { id },
        data: { name, zoneId: zoneId ?? null, skipFriday },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async remove(id: number) {
    try {
      await this.prisma.location.update({
        where: { id },
        data: { active: false },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async unassignUserFromLocation(id: number) {
    try {
      await this.prisma.locationUsers.update({
        where: { id },
        data: { removedAt: new Date() },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async assignEntityToLocation(
    user: User,
    { locationId, entityIds, transit }: LocationAssignInput
  ) {
    try {
      if (entityIds.length > 0) {
        const newLocation = await this.prisma.location.findFirst({
          where: { id: locationId },
        });
        const entities = await this.prisma.entity.findMany({
          where: { id: { in: entityIds } },
          include: { location: true },
        });
        for (const id of entityIds) {
          const entity = entities.find((e) => e.id === id);
          if (transit) {
            await this.entityService.createEntityHistoryInBackground({
              type: 'Transition finished',
              description: `Transition finished on ${moment().format(
                'YYYY-MM-DD HH:mm:ss'
              )}. Location changed from ${entity?.location?.name} to ${
                newLocation.name
              }`,
              entityId: id,
              completedById: user.id,
            });
            await this.prisma.entity.update({
              where: { id },
              data: { locationId, transit: false },
            });
          } else {
            await this.entityService.createEntityHistoryInBackground({
              type: 'Transition start',
              description: `Transition started on ${moment().format(
                'YYYY-MM-DD HH:mm:ss'
              )}. Location changed from ${entity?.location?.name} to ${
                newLocation.name
              }`,
              entityId: id,
              completedById: user.id,
            });
            await this.prisma.entity.update({
              where: { id },
              data: { locationId, transit: true },
            });
          }
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

  async assignUserToLocation(
    user: User,
    { locationIds, userIds, userType }: LocationAssignInput
  ) {
    try {
      if (userIds.length > 0 && locationIds.length > 0) {
        await this.prisma.locationUsers.updateMany({
          where: {
            userId: { in: userIds },
            locationId: { in: locationIds },
            removedAt: null,
          },
          data: { removedAt: new Date() },
        });
        const userIdsExceptCurrentUser = userIds.filter((id) => id != user.id);
        for (const loc of locationIds) {
          await this.prisma.locationUsers.createMany({
            data: userIds.map((userId) => ({
              locationId: loc,
              userId,
              userType,
            })),
          });

          const location = await this.prisma.location.findFirst({
            where: { id: loc },
            select: { name: true },
          });
          for (const id of userIdsExceptCurrentUser) {
            await this.notificationService.createInBackground({
              userId: id,
              body: `${user.fullName} (${user.rcno}) assigned you to ${location?.name} as ${userType}`,
            });
          }
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

  async bulkUnassignUserFromLocation(
    user: User,
    { locationIds, userIds, userType }: LocationAssignInput
  ) {
    try {
      if (userIds.length > 0 && locationIds.length > 0) {
        await this.prisma.locationUsers.updateMany({
          where: {
            userId: { in: userIds },
            locationId: { in: locationIds },
            userType,
            removedAt: null,
          },
          data: { removedAt: new Date() },
        });
        const userIdsExceptCurrentUser = userIds.filter((id) => id != user.id);
        for (const loc of locationIds) {
          const location = await this.prisma.location.findFirst({
            where: { id: loc },
            select: { name: true },
          });
          for (const id of userIdsExceptCurrentUser) {
            await this.notificationService.createInBackground({
              userId: id,
              body: `${user.fullName} (${user.rcno}) removed you from ${location?.name} as ${userType}`,
            });
          }
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

  async updateEntityLocation(user: User, entityId: number, locationId: number) {
    try {
      const newLocation = await this.prisma.location.findFirst({
        where: { id: locationId },
      });
      const entity = await this.prisma.entity.findFirst({
        where: { id: entityId },
        include: { location: true },
      });
      await this.entityService.createEntityHistoryInBackground({
        type: 'Transition start',
        description: `Transition started on ${moment().format(
          'YYYY-MM-DD HH:mm:ss'
        )}. Location change from ${entity?.location?.name} to ${
          newLocation.name
        }`,
        entityId: entityId,
        completedById: user.id,
      });
      await this.prisma.entity.update({
        where: { id: entityId },
        data: { locationId, transit: true },
      });

      //get all users from location
      const locAssignments = await this.prisma.locationUsers.findMany({
        where: {
          locationId,
          removedAt: null,
        },
        include: { location: true },
      });
      //remove all assigned users in entity
      await this.prisma.entityAssignment.updateMany({
        where: { entityId, removedAt: null },
        data: { removedAt: new Date() },
      });
      //create new assign for entity and notify user
      for (const loc of locAssignments) {
        await this.prisma.entityAssignment.create({
          data: {
            entityId,
            userId: loc?.userId,
            type: loc?.userType,
          },
        });
        if (user?.id !== loc?.userId) {
          await this.notificationService.createInBackground({
            userId: loc?.userId,
            body: `Entity (${entityId}) relocated. You've been assigned you to ${loc?.location?.name} as ${loc?.userType}`,
          });
        }
      }
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async updateLocationUser(id: number, locationId: number, userType: string) {
    try {
      await this.prisma.locationUsers.update({
        where: { id: id },
        data: { locationId, userType },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }
}
