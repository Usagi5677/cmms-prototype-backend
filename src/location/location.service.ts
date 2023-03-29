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
import {
  autoAssignUsersInterface,
  UserAssignmentService,
} from 'src/user-assignment/user-assignment.service';

@Injectable()
export class LocationService {
  constructor(
    private prisma: PrismaService,
    private readonly notificationService: NotificationService,
    @Inject(forwardRef(() => EntityService))
    private entityService: EntityService,
    private userAssignmentService: UserAssignmentService
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
      if (e?.response) {
        throw new InternalServerErrorException(e?.response?.message);
      }
      throw new InternalServerErrorException(
        'Unexpected while creating location.'
      );
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

  async update(
    user: User,
    { id, name, zoneId, skipFriday }: UpdateLocationInput
  ) {
    try {
      await this.prisma.location.update({
        where: { id },
        data: { name, zoneId: zoneId ?? null, skipFriday },
      });

      //get all entity with location and zone
      const entities = await this.prisma.entity.findMany({
        where: { location: { zoneId, id }, deletedAt: null },
        select: { id: true, divisionId: true },
      });
      //get their division ids
      const divisionIds = entities.map((e) => e.divisionId);
      //get their entity ids
      const entityIds = entities.map((e) => e.id);

      //auto user assign queue
      const autoAssign: autoAssignUsersInterface = {
        userId: user?.id,
        divisionIds,
        types: ['Engineer'],
        zoneId,
        entityIds,
        description: `${name} Zone changed`,
      };
      await this.userAssignmentService.autoAssignUsersInBackground(autoAssign);
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
        //auto user assign queue
        const autoAssign: autoAssignUsersInterface = {
          userId: user?.id,
          types: ['Technician', 'User'],
          locationId,
          entityIds,
          description: `Entity Location changed`,
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

  //not using this anymore
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

  //not using this anymore
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

      //auto user assign queue
      const autoAssign: autoAssignUsersInterface = {
        userId: user?.id,
        types: ['Technician', 'User'],
        locationId,
        entityIds: [entityId],
        description: `Entity Location changed`,
      };
      await this.userAssignmentService.autoAssignUsersInBackground(autoAssign);
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //not using this anymore
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

      const locations = await this.prisma.location.findMany({
        where,
        take: limit,
      });
      return locations;
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException(
        'Unexpected error occured while searching locations.'
      );
    }
  }
}
