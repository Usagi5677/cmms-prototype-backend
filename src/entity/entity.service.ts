import { InjectQueue } from '@nestjs/bull';
import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Queue } from 'bull';

import { User } from 'src/models/user.model';
import { RedisCacheService } from 'src/redisCache.service';
import { ChecklistTemplateService } from 'src/resolvers/checklist-template/checklist-template.service';
import { NotificationService } from 'src/services/notification.service';
import { UserService } from 'src/services/user.service';
import * as moment from 'moment';
import { EntityConnectionArgs } from './dto/args/entity-connection.args';
import { PaginatedEntity } from './dto/paginations/entity-connection.model';
import {
  connectionFromArraySlice,
  getPagingParameters,
} from 'src/common/pagination/connection-args';
import { PaginatedEntityRepair } from './dto/paginations/entity-repair-connection.model';
import { EntityHistoryConnectionArgs } from './dto/args/entity-history-connection.args';
import { PaginatedEntityHistory } from './dto/paginations/entity-history-connection.model';
import { Entity, Prisma, PrismaPromise } from '@prisma/client';
import { EntityPeriodicMaintenanceConnectionArgs } from './dto/args/entity-periodic-maintenance-connection.args';
import { PaginatedEntityPeriodicMaintenance } from './dto/paginations/entity-periodic-maintenance-connection.model';
import { PaginatedEntityPeriodicMaintenanceTask } from './dto/paginations/entity-pm-tasks-connection.model';
import { ENTITY_ASSIGNMENT_TYPES } from 'src/constants';
import {
  EntityTransferInput,
  EntityTransferUserInput,
} from './dto/args/entity-transfer.input';
import { LocationService } from 'src/location/location.service';
import { AuthService } from 'src/services/auth.service';
import { UnassignExternalInput } from './dto/args/unassign-external.input';
import { Location } from 'src/location/entities/location.entity';
import { EntityRepairConnectionArgs } from './dto/args/entity-repair-connection.args';
import { ChecklistService } from 'src/checklist/checklist.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { Entity as EntityModel } from './dto/models/entity.model';
import { GraphQLFloat } from 'graphql';

export interface EntityHistoryInterface {
  entityId: number;
  entityType?: string;
  type: string;
  description: string;
  completedById?: number;
  workingHour?: number;
  idleHour?: number;
  breakdownHour?: number;
  entityStatus?: string;
}

@Injectable()
export class EntityService {
  constructor(
    private prisma: PrismaService,
    private userService: UserService,
    private readonly redisCacheService: RedisCacheService,
    private readonly notificationService: NotificationService,
    @InjectQueue('cmms-entity-history')
    private entityHistoryQueue: Queue,
    @Inject(forwardRef(() => ChecklistTemplateService))
    private readonly checklistTemplateService: ChecklistTemplateService,
    private readonly checklistService: ChecklistService,
    private readonly locationService: LocationService,
    private readonly authService: AuthService
  ) {}

  async findOne(id: number, include?: any) {
    const entity = await this.prisma.entity.findFirst({
      where: { id },
      include: include ?? undefined,
    });
    if (!entity) {
      throw new BadRequestException('Entity not found.');
    }
    return entity;
  }

  async search(
    query?: string,
    entityIds?: number[],
    limit?: number,
    entityType?: string
  ) {
    if (!limit) limit = 10;
    // eslint-disable-next-line prefer-const
    let where: any = { AND: [] };

    where.AND.push({
      deletedAt: null,
    });
    if (query) {
      where.AND.push({
        machineNumber: { contains: query, mode: 'insensitive' },
      });
    }
    if (entityIds) {
      where.AND.push({
        id: { in: entityIds },
      });
    }
    if (entityType) {
      where.AND.push({
        type: {
          entityType: {
            in: entityType,
          },
        },
      });
    }

    const entities = await this.prisma.entity.findMany({
      where,
      take: limit,
      include: {
        type: true,
        location: true,
      },
    });
    return entities;
  }

  //** Create entity. */
  async createEntity(
    user: User,
    typeId: number,
    machineNumber: string,
    model: string,
    locationId: number,
    divisionId: number,
    engine: string,
    measurement: string,
    currentRunning: number,
    lastService: number,
    brandId: number,
    registeredDate: Date,
    parentEntityId: number,
    hullTypeId: number,
    dimension: typeof GraphQLFloat,
    registryNumber: string
  ) {
    try {
      const convertedDimension = dimension as unknown as number;
      const newDailyTemplate = await this.prisma.checklistTemplate.create({
        data: { type: 'Daily' },
        include: { items: true },
      });
      const newWeeklyTemplate = await this.prisma.checklistTemplate.create({
        data: { type: 'Weekly' },
        include: { items: true },
      });
      //sub entity with parent entity value
      if (parentEntityId) {
        const parent = await this.prisma.entity.findFirst({
          where: { id: parentEntityId },
          include: { assignees: true, division: true },
        });
        registeredDate = parent?.registeredDate;
        divisionId = parent?.division?.id;
        locationId = parent.locationId;
        const entity = await this.prisma.entity.create({
          data: {
            createdById: user.id,
            typeId,
            machineNumber,
            model,
            locationId,
            divisionId,
            engine,
            measurement,
            currentRunning,
            lastService,
            brandId,
            registeredDate,
            dailyChecklistTemplateId: newDailyTemplate.id,
            weeklyChecklistTemplateId: newWeeklyTemplate.id,
            parentEntityId,
            hullTypeId,
            dimension: convertedDimension,
            registryNumber,
          },
        });
        for (const e of parent.assignees) {
          await this.prisma.entityAssignment.create({
            data: {
              entityId: entity.id,
              userId: e.userId,
              type: e.type,
            },
          });
        }
      } else {
        const entity = await this.prisma.entity.create({
          data: {
            createdById: user.id,
            typeId,
            machineNumber,
            model,
            locationId,
            divisionId,
            engine,
            measurement,
            currentRunning,
            lastService,
            brandId,
            registeredDate,
            dailyChecklistTemplateId: newDailyTemplate.id,
            weeklyChecklistTemplateId: newWeeklyTemplate.id,
            hullTypeId,
            dimension: convertedDimension,
            registryNumber,
          },
        });
        await this.checklistTemplateService.updateEntityChecklists(
          entity.id,
          'Daily',
          newDailyTemplate
        );
        await this.checklistTemplateService.updateEntityChecklists(
          entity.id,
          'Weekly',
          newWeeklyTemplate
        );
        await this.createEntityHistoryInBackground({
          type: 'Entity Add',
          description: `Entity created`,
          entityId: entity.id,
          completedById: user.id,
        });
      }
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Delete entity. */
  async deleteEntity(id: number, user: User) {
    try {
      const users = await this.getEntityAssignmentIds(id, user.id);
      for (let index = 0; index < users.length; index++) {
        await this.notificationService.createInBackground({
          userId: users[index],
          body: `${user.fullName} (${user.rcno}) deleted entity (${id})}`,
          link: `/entity/${id}`,
        });
      }
      await this.prisma.entityAssignment.updateMany({
        where: { userId: { in: users }, entityId: id },
        data: { removedAt: new Date() },
      });
      //use soft delete middleware later
      await this.prisma.entity.update({
        where: { id },
        data: {
          deletedAt: new Date(),
        },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Edit Entity */
  async editEntity(
    user: User,
    id: number,
    typeId: number,
    machineNumber: string,
    model: string,
    locationId: number,
    divisionId: number,
    engine: string,
    measurement: string,
    brandId: number,
    registeredDate: Date,
    hullTypeId: number,
    dimension: typeof GraphQLFloat,
    registryNumber: string
  ) {
    const convertedDimension = dimension as unknown as number;
    const entity = await this.prisma.entity.findFirst({
      where: { id },
      include: {
        location: locationId ? true : false,
        type: typeId ? true : false,
        subEntities: true,
        division: true,
        hullType: true,
        brand: true,
      },
    });
    // Check if admin of entity or has permission
    await this.checkEntityAssignmentOrPermission(
      id,
      user.id,
      entity,
      ['Admin'],
      ['EDIT_ENTITY']
    );
    try {
      if (machineNumber && entity?.machineNumber != machineNumber) {
        await this.createEntityHistoryInBackground({
          type: 'Entity Edit',
          description: `Machine number changed from ${entity?.machineNumber} to ${machineNumber}.`,
          entityId: id,
          completedById: user.id,
        });
      }
      if (registryNumber && entity?.registryNumber != registryNumber) {
        await this.createEntityHistoryInBackground({
          type: 'Entity Edit',
          description: `Registry number changed from ${entity?.registryNumber} to ${registryNumber}.`,
          entityId: id,
          completedById: user.id,
        });
      }
      if (model && entity?.model != model) {
        await this.createEntityHistoryInBackground({
          type: 'Entity Edit',
          description: `Model changed from ${entity?.model} to ${model}.`,
          entityId: id,
          completedById: user.id,
        });
      }
      if (typeId && entity?.typeId != typeId) {
        const newType = await this.prisma.type.findFirst({
          where: { id: typeId },
        });
        await this.createEntityHistoryInBackground({
          type: 'Entity Edit',
          description: `Type changed from ${entity?.type?.name} to ${newType?.name}.`,
          entityId: id,
          completedById: user.id,
        });
      }
      if (hullTypeId && entity?.hullTypeId != hullTypeId) {
        const newHullType = await this.prisma.hullType.findFirst({
          where: { id: hullTypeId },
        });
        await this.createEntityHistoryInBackground({
          type: 'Entity Edit',
          description: `Hull Type changed from ${entity?.hullType?.name} to ${newHullType?.name}.`,
          entityId: id,
          completedById: user.id,
        });
      }
      if (dimension && entity?.dimension != convertedDimension) {
        await this.createEntityHistoryInBackground({
          type: 'Entity Edit',
          description: `Dimension changed from ${entity?.dimension} to ${dimension}.`,
          entityId: id,
          completedById: user.id,
        });
      }
      if (divisionId && entity?.divisionId != divisionId) {
        const newDivision = await this.prisma.division.findFirst({
          where: { id: divisionId },
        });
        await this.createEntityHistoryInBackground({
          type: 'Entity Edit',
          description: `Division changed${
            entity?.divisionId ? ` from ${entity?.division?.name}` : ``
          } to ${newDivision?.name}.`,
          entityId: id,
          completedById: user.id,
        });
      }
      if (locationId && entity?.locationId != locationId) {
        const newLocation = await this.prisma.location.findFirst({
          where: { id: locationId },
        });
        await this.prisma.entity.update({
          where: { id },
          data: { transit: true },
        });
        await this.createEntityHistoryInBackground({
          type: 'Transition start',
          description: `Transition started on ${moment().format(
            'YYYY-MM-DD HH:mm:ss'
          )}. Location change from ${newLocation.name} to ${
            entity?.location?.name
          }`,
          entityId: id,
          completedById: user.id,
        });
        /*
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
          where: { entityId: id, removedAt: null },
          data: { removedAt: new Date() },
        });
        //create new assign for entity and notify user
        for (const loc of locAssignments) {
          await this.prisma.entityAssignment.create({
            data: {
              entityId: id,
              userId: loc?.userId,
              type: loc?.userType,
            },
          });
          if (user?.id !== loc?.userId) {
            await this.notificationService.createInBackground({
              userId: loc?.userId,
              body: `Entity (${id}) relocated. You've been assigned you to ${loc?.location?.name} as ${loc?.userType}`,
            });
          }
        }
        */
      }
      if (engine && entity?.engine != engine) {
        await this.createEntityHistoryInBackground({
          type: 'Entity Edit',
          description: `Engine changed from ${entity?.engine} to ${engine}.`,
          entityId: id,
          completedById: user.id,
        });
      }
      if (measurement && entity?.measurement != measurement) {
        await this.createEntityHistoryInBackground({
          type: 'Entity Edit',
          description: `Measurement changed from ${entity?.measurement} to ${measurement}.`,
          entityId: id,
          completedById: user.id,
        });
      }
      if (brandId && entity?.brandId != brandId) {
        const newBrand = await this.prisma.brand.findFirst({
          where: { id: brandId },
        });
        await this.createEntityHistoryInBackground({
          type: 'Entity Edit',
          description: `Brand changed from ${entity?.brand?.name} to ${newBrand?.name}.`,
          entityId: id,
          completedById: user.id,
        });
      }
      if (
        registeredDate &&
        moment(entity?.registeredDate).format('DD MMMM YYYY HH:mm:ss') !=
          moment(registeredDate).format('DD MMMM YYYY HH:mm:ss')
      ) {
        await this.createEntityHistoryInBackground({
          type: 'Entity Edit',
          description: `Registered date changed from ${moment(
            entity?.registeredDate
          ).format('DD MMMM YYYY')} to ${moment(registeredDate).format(
            'DD MMMM YYYY'
          )}.`,
          entityId: id,
          completedById: user.id,
        });
      }

      const users = await this.getEntityAssignmentIds(id, user.id);
      for (let index = 0; index < users.length; index++) {
        await this.notificationService.createInBackground({
          userId: users[index],
          body: `${user.fullName} (${user.rcno}) edited entity (${id})}`,
          link: `/entity/${id}`,
        });
      }
      const subEntitiesId = entity.subEntities.map((e) => e.id);
      await this.prisma.entity.update({
        data: {
          typeId: typeId ?? undefined,
          machineNumber,
          model,
          locationId: locationId ?? undefined,
          divisionId,
          engine: engine ? engine : null,
          measurement,
          brandId,
          registeredDate,
          subEntities: {
            updateMany: {
              where: { id: { in: subEntitiesId } },
              data: { locationId: locationId ?? undefined },
            },
          },
          hullTypeId,
          dimension: convertedDimension,
          registryNumber,
        },
        where: { id },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Set entity status. */
  async setEntityStatus(
    entityId: number,
    status: string,
    user?: User,
    requestingUserUuid?: string
  ) {
    if (!user) {
      user = await this.authService.validateUser(requestingUserUuid);
    }
    if (!requestingUserUuid) {
      // Check if admin, engineer of entity or has permission
      await this.checkEntityAssignmentOrPermission(
        entityId,
        user.id,
        undefined,
        ['Admin', 'Engineer'],
        ['MODIFY_BREAKDOWN']
      );
    }
    try {
      const entity = await this.prisma.entity.findFirst({
        where: { id: entityId },
      });
      await this.prisma.entity.update({
        where: { id: entityId },
        data: { status, statusChangedAt: new Date(), deletedAt: null },
      });
      if (status === 'Working') {
        const breakdowns = await this.prisma.breakdown.findMany({
          where: { entityId, completedAt: null },
        });
        const breakdownIds = breakdowns?.map((b) => b.id);
        await this.prisma.breakdown.updateMany({
          where: { id: { in: breakdownIds } },
          data: { completedAt: new Date() },
        });
      }
      if (entity?.parentEntityId) {
        if (status === 'Breakdown') {
          await this.prisma.breakdown.create({
            data: {
              entityId: entity.parentEntityId,
              createdById: user.id,
              type: 'Breakdown',
              details: {
                create: {
                  createdById: user.id,
                  description: `Sub Entity (${entityId}) broken`,
                },
              },
            },
          });
          await this.prisma.entity.update({
            where: { id: entity.parentEntityId },
            data: { status, statusChangedAt: new Date(), deletedAt: null },
          });
        } else if (status === 'Critical') {
          await this.prisma.breakdown.create({
            data: {
              entityId: entity.parentEntityId,
              createdById: user.id,
              type: 'Critical',
              details: {
                create: {
                  createdById: user.id,
                  description: `Sub Entity (${entityId}) in critical condition`,
                },
              },
            },
          });
          await this.prisma.entity.update({
            where: { id: entity.parentEntityId },
            data: { status, statusChangedAt: new Date(), deletedAt: null },
          });
        } else if (status === 'Working') {
          const breakdowns = await this.prisma.breakdown.findMany({
            where: { entityId, completedAt: null },
          });
          const breakdownIds = breakdowns?.map((b) => b.id);
          await this.prisma.breakdown.updateMany({
            where: { id: { in: breakdownIds } },
            data: { completedAt: new Date() },
          });
        }
      }
      await this.createEntityHistoryInBackground({
        type: 'Status Change',
        description: `Status changed to ${status}`,
        entityId: entityId,
        completedById: user.id,
      });
      const users = await this.getEntityAssignmentIds(entityId, user.id);
      for (let index = 0; index < users.length; index++) {
        await this.notificationService.createInBackground({
          userId: users[index],
          body: `${user.fullName} (${user.rcno}) set status to ${status} on entity ${entityId}`,
          link: `/entity/${entityId}`,
        });
      }
      if (status === 'Working' || status === 'Critical') {
        await this.checklistService.generateChecklists();
      }
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async getLatestReading(entity: any, untill?: Date): Promise<number> {
    try {
      let reading = entity.currentRunning;
      const latestDailyChecklistWithReading =
        await this.prisma.checklist.findFirst({
          where: {
            entityId: entity.id,
            type: 'Daily',
            currentMeterReading: { not: null },
          },
          orderBy: { from: 'desc' },
        });
      // First get the latest checklist which has meter reading added
      if (latestDailyChecklistWithReading) {
        reading = latestDailyChecklistWithReading.currentMeterReading;
      }
      // Then get all the checklists since then which have daily readings added
      const checklistsSince = await this.prisma.checklist.findMany({
        where: {
          entityId: entity.id,
          type: 'Daily',
          from: latestDailyChecklistWithReading
            ? { gt: latestDailyChecklistWithReading.from }
            : undefined,
          workingHour: { not: null },
          to: untill ? { lt: untill } : undefined,
        },
        select: { workingHour: true },
      });
      checklistsSince.forEach((c) => {
        reading += c.workingHour;
      });
      return reading;
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  // Get entity details
  async getSingleEntity(user: User, entityId: number) {
    try {
      const entity = await this.prisma.entity.findFirst({
        where: { id: entityId },
        include: {
          createdBy: true,
          dailyChecklistTemplate: {
            include: {
              items: true,
            },
          },
          weeklyChecklistTemplate: {
            include: {
              items: true,
            },
          },
          assignees: { include: { user: true }, where: { removedAt: null } },
          type: true,
          location: { include: { zone: true } },
          brand: true,
          subEntities: {
            where: { deletedAt: null },
            include: {
              sparePRs: {
                orderBy: { id: 'desc' },
                where: { completedAt: null },
                include: { sparePRDetails: true },
              },
              breakdowns: {
                orderBy: { id: 'desc' },
                where: { completedAt: null },
                include: {
                  createdBy: true,
                  details: { include: { repairs: true } },
                  repairs: { include: { breakdownDetail: true } },
                },
              },
              assignees: {
                include: {
                  user: true,
                },
                where: {
                  removedAt: null,
                },
              },
              type: true,
              location: { include: { zone: true } },
              repairs: {
                orderBy: { id: 'desc' },
                where: { breakdownId: null, breakdownDetailId: null },
                take: 10,
              },
              hullType: true,
              brand: true,
              parentEntity: true,
            },
            orderBy: { id: 'desc' },
          },
          division: true,
          hullType: true,
        },
      });
      if (entity?.type?.entityType === 'Machine') {
        await this.checkEntityAssignmentOrPermission(
          entityId,
          user.id,
          entity,
          [],
          ['VIEW_ALL_ENTITY', 'VIEW_ALL_MACHINERY']
        );
      } else if (entity?.type?.entityType === 'Vehicle') {
        await this.checkEntityAssignmentOrPermission(
          entityId,
          user.id,
          entity,
          [],
          ['VIEW_ALL_ENTITY', 'VIEW_ALL_VEHICLES']
        );
      } else if (entity?.type?.entityType === 'Vessel') {
        await this.checkEntityAssignmentOrPermission(
          entityId,
          user.id,
          entity,
          [],
          ['VIEW_ALL_ENTITY', 'VIEW_ALL_VESSELS']
        );
      }
      if (!entity) throw new BadRequestException('Entity not found.');
      const reading = await this.getLatestReading(entity);
      entity.currentRunning = reading;
      for (const e of entity.subEntities) {
        e.currentRunning = await this.getLatestReading(e);
      }
      return entity;
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Get all entity. Results are paginated. User cursor argument to go forward/backward. */
  async getAllEntityWithPagination(
    user: User,
    args: EntityConnectionArgs
  ): Promise<PaginatedEntity> {
    try {
      const userPermissions =
        await this.userService.getUserRolesPermissionsList(user.id);
      const hasViewAll = userPermissions.includes('VIEW_ALL_ENTITY');
      const hasViewAllMachinery =
        userPermissions.includes('VIEW_ALL_MACHINERY');
      const hasViewAllVehicles = userPermissions.includes('VIEW_ALL_VEHICLES');
      const hasViewAllVessels = userPermissions.includes('VIEW_ALL_VESSELS');
      const hasViewAllDivisionEntity = userPermissions.includes(
        'VIEW_ALL_DIVISION_ENTITY'
      );

      const { limit, offset } = getPagingParameters(args);
      const limitPlusOne = limit + 1;
      const {
        createdById,
        search,
        assignedToId,
        entityType,
        status,
        locationIds,
        divisionIds,
        isAssigned,
        typeIds,
        zoneIds,
        brandIds,
        engine,
        measurement,
        lteInterService,
        gteInterService,
        isIncompleteChecklistTask,
        entityIds,
        divisionExist,
        locationExist,
        brandExist,
      } = args;

      // eslint-disable-next-line prefer-const
      let where: any = { AND: [] };
      const todayStart = moment().startOf('day');
      const todayEnd = moment().endOf('day');

      where.AND.push({
        deletedAt: null,
      });

      if (search) {
        const or: any = [
          { model: { contains: search, mode: 'insensitive' } },
          { machineNumber: { contains: search, mode: 'insensitive' } },
        ];
        // If search contains all numbers, search the machine ids as well
        if (/^(0|[1-9]\d*)$/.test(search)) {
          or.push({ id: parseInt(search) });
        }
        where.AND.push({
          OR: or,
        });
      }
      if (createdById) {
        where.AND.push({ createdById });
      }
      if (assignedToId || !hasViewAll) {
        if (
          assignedToId ||
          (!hasViewAllMachinery &&
            entityType?.some((type) => type === 'Machine') &&
            !hasViewAllDivisionEntity)
        ) {
          where.AND.push({
            assignees: {
              some: {
                userId:
                  !hasViewAll || !hasViewAllMachinery ? user.id : assignedToId,
                removedAt: null,
              },
            },
          });
        } else if (
          assignedToId ||
          (!hasViewAllVehicles &&
            entityType?.some((type) => type === 'Vehicle') &&
            !hasViewAllDivisionEntity)
        ) {
          where.AND.push({
            assignees: {
              some: {
                userId:
                  !hasViewAll || !hasViewAllVehicles ? user.id : assignedToId,
                removedAt: null,
              },
            },
          });
        } else if (
          assignedToId ||
          (!hasViewAllVessels &&
            entityType?.some((type) => type === 'Vessel') &&
            !hasViewAllDivisionEntity)
        ) {
          where.AND.push({
            assignees: {
              some: {
                userId:
                  !hasViewAll || !hasViewAllVessels ? user.id : assignedToId,
                removedAt: null,
              },
            },
          });
        } else if (
          assignedToId ||
          (hasViewAllDivisionEntity &&
            entityType?.some((type) => type === 'Machine') &&
            !hasViewAllMachinery)
        ) {
          const userDivision = await this.prisma.divisionUsers.findMany({
            where: { userId: user.id },
          });
          const userDivisionIds = userDivision?.map((d) => d?.divisionId);
          const or: any = [
            { divisionId: { in: userDivisionIds } },
            {
              assignees: {
                some: {
                  userId:
                    !hasViewAll || !hasViewAllMachinery
                      ? user.id
                      : assignedToId,
                  removedAt: null,
                },
              },
            },
          ];
          where.AND.push({
            OR: or,
          });
        } else if (
          assignedToId ||
          (hasViewAllDivisionEntity &&
            entityType?.some((type) => type === 'Vehicle') &&
            !hasViewAllVehicles)
        ) {
          const userDivision = await this.prisma.divisionUsers.findMany({
            where: { userId: user.id },
          });
          const userDivisionIds = userDivision?.map((d) => d?.divisionId);
          const or: any = [
            { divisionId: { in: userDivisionIds } },
            {
              assignees: {
                some: {
                  userId:
                    !hasViewAll || !hasViewAllVehicles ? user.id : assignedToId,
                  removedAt: null,
                },
              },
            },
          ];
          where.AND.push({
            OR: or,
          });
        } else if (
          assignedToId ||
          (hasViewAllDivisionEntity &&
            entityType?.some((type) => type === 'Vessel') &&
            !hasViewAllVessels)
        ) {
          const userDivision = await this.prisma.divisionUsers.findMany({
            where: { userId: user.id },
          });
          const userDivisionIds = userDivision?.map((d) => d?.divisionId);
          const or: any = [
            { divisionId: { in: userDivisionIds } },
            {
              assignees: {
                some: {
                  userId:
                    !hasViewAll || !hasViewAllVessels ? user.id : assignedToId,
                  removedAt: null,
                },
              },
            },
          ];
          where.AND.push({
            OR: or,
          });
        } else if (
          assignedToId ||
          (hasViewAllDivisionEntity && !hasViewAllVessels)
        ) {
          const userDivision = await this.prisma.divisionUsers.findMany({
            where: { userId: user.id },
          });
          const userDivisionIds = userDivision?.map((d) => d?.divisionId);
          const or: any = [
            { divisionId: { in: userDivisionIds } },
            {
              assignees: {
                some: {
                  userId:
                    !hasViewAll || !hasViewAllVessels ? user.id : assignedToId,
                  removedAt: null,
                },
              },
            },
          ];
          where.AND.push({
            OR: or,
          });
        }
      }

      if (status?.length > 0) {
        where.AND.push({
          status: { in: status },
        });
      }

      if (locationIds?.length > 0) {
        where.AND.push({
          locationId: {
            in: locationIds,
          },
        });
      }

      if (zoneIds?.length > 0) {
        where.AND.push({ location: { zoneId: { in: zoneIds } } });
      }

      if (brandIds?.length > 0) {
        where.AND.push({
          brandId: {
            in: brandIds,
          },
        });
      }

      if (divisionIds?.length > 0) {
        where.AND.push({
          divisionId: {
            in: divisionIds,
          },
        });
      }

      if (isAssigned) {
        where.AND.push({
          assignees: {
            some: {
              removedAt: null,
            },
          },
        });
      }

      if (entityType?.length > 0) {
        where.AND.push({
          type: {
            entityType: {
              in: entityType,
            },
          },
        });
      }

      if (typeIds?.length > 0) {
        where.AND.push({
          typeId: { in: typeIds },
        });
      }

      if (engine?.length > 0) {
        where.AND.push({
          engine: { in: engine },
        });
      }

      if (measurement?.length > 0) {
        where.AND.push({
          measurement: { in: measurement },
        });
      }

      if (gteInterService?.replace(/\D/g, '')) {
        where.AND.push({
          interService: { gte: parseInt(gteInterService.replace(/\D/g, '')) },
        });
      }

      if (lteInterService?.replace(/\D/g, '')) {
        where.AND.push({
          interService: { lte: parseInt(lteInterService.replace(/\D/g, '')) },
        });
      }

      if (
        gteInterService?.replace(/\D/g, '') &&
        lteInterService?.replace(/\D/g, '')
      ) {
        where.AND.push({
          interService: {
            gte: parseInt(gteInterService.replace(/\D/g, '')),
            lte: parseInt(lteInterService.replace(/\D/g, '')),
          },
        });
      }

      if (isIncompleteChecklistTask) {
        const checklist = await this.prisma.checklist.findMany({
          where: {
            NOT: [{ entityId: null }],
            from: todayStart.toDate(),
            to: todayEnd.toDate(),
          },
          select: {
            id: true,
          },
        });

        const checklistIds = checklist.map((id) => id.id);

        const checklistItem = await this.prisma.checklistItem.findMany({
          where: {
            checklistId: {
              in: checklistIds,
            },
            completedAt: null,
          },
          select: {
            checklistId: true,
          },
        });
        const checklistItemIds = checklistItem.map((id) => id.checklistId);

        const entity = await this.prisma.checklist.findMany({
          where: {
            id: {
              in: checklistItemIds,
            },
          },
          select: {
            entityId: true,
          },
        });
        const entityIds = entity.map((id) => id.entityId);
        where.AND.push({
          id: {
            in: entityIds,
          },
        });
      }

      if (entityIds?.length > 0) {
        where.AND.push({ id: { in: entityIds } });
      }
      if (divisionExist) {
        where.AND.push({ divisionId: { not: null } });
      }
      if (locationExist) {
        where.AND.push({ locationId: { not: null } });
      }
      if (brandExist) {
        where.AND.push({ brandId: { not: null } });
      }
      const entities = await this.prisma.entity.findMany({
        skip: offset,
        take: limitPlusOne,
        where,
        include: {
          createdBy: true,
          sparePRs: {
            orderBy: { id: 'desc' },
            where: { completedAt: null },
            include: { sparePRDetails: true },
          },
          breakdowns: {
            orderBy: { id: 'desc' },
            where: { completedAt: null },
            include: {
              createdBy: true,
              details: { include: { repairs: true } },
              repairs: { include: { breakdownDetail: true } },
            },
          },
          assignees: {
            include: {
              user: true,
            },
            where: {
              removedAt: null,
            },
          },
          type: {
            include: {
              interServiceColor: {
                where: { removedAt: null },
                include: { brand: true, type: true },
              },
            },
          },
          hullType: true,
          location: { include: { zone: true } },
          repairs: {
            orderBy: { id: 'desc' },
            where: { breakdownId: null, breakdownDetailId: null },
            take: 10,
          },
          brand: true,
          division: true,
          subEntities: {
            where: { deletedAt: null },
            include: {
              sparePRs: {
                orderBy: { id: 'desc' },
                where: { completedAt: null },
                include: { sparePRDetails: true },
              },
              breakdowns: {
                orderBy: { id: 'desc' },
                where: { completedAt: null },
                include: {
                  createdBy: true,
                  details: { include: { repairs: true } },
                  repairs: { include: { breakdownDetail: true } },
                },
              },
              assignees: {
                include: {
                  user: true,
                },
                where: {
                  removedAt: null,
                },
              },
              type: {
                include: {
                  interServiceColor: {
                    where: { removedAt: null },
                    include: { brand: true, type: true },
                  },
                },
              },
              location: { include: { zone: true } },
              repairs: {
                orderBy: { id: 'desc' },
                where: { breakdownId: null, breakdownDetailId: null },
                take: 10,
              },
              hullType: true,
              parentEntity: true,
              brand: true,
            },
            orderBy: { id: 'desc' },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });
      for (const entity of entities) {
        const reading = await this.getLatestReading(entity);
        entity.currentRunning = reading;
      }
      const count = await this.prisma.entity.count({ where });
      const { edges, pageInfo } = connectionFromArraySlice(
        entities.slice(0, limit),
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

  //** Create entity repair request. */
  async createEntityRepairRequest(
    user: User,
    entityId: number,
    internal: boolean,
    projectName: string,
    location: string,
    reason: string,
    additionalInfo: string,
    attendInfo: string,
    operatorId: number,
    supervisorId: number,
    projectManagerId: number
  ) {
    await this.checkEntityAssignmentOrPermission(
      entityId,
      user.id,
      undefined,
      ['Admin', 'Engineer', 'User'],
      ['MODIFY_REPAIR_REQUEST']
    );
    try {
      const repair = await this.prisma.entityRepairRequest.create({
        data: {
          entityId,
          internal,
          projectName,
          location,
          reason,
          additionalInfo,
          attendInfo,
          operatorId,
          supervisorId,
          projectManagerId,
          requestorId: user.id,
        },
      });
      await this.createEntityHistoryInBackground({
        type: 'Repair Request',
        description: `Repair request (${repair.id})`,
        entityId: entityId,
        completedById: user.id,
      });
      const users = await this.getEntityAssignmentIds(entityId, user.id);
      for (let index = 0; index < users.length; index++) {
        await this.notificationService.createInBackground({
          userId: users[index],
          body: `${user.fullName} (${user.rcno}) added new repair request on entity ${entityId}`,
          link: `/entity/${entityId}`,
        });
      }
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Edit entity repair request */
  async editEntityRepairRequest(
    user: User,
    id: number,
    internal: boolean,
    projectName: string,
    location: string,
    reason: string,
    additionalInfo: string,
    attendInfo: string,
    operatorId: number,
    supervisorId: number,
    projectManagerId: number
  ) {
    const repair = await this.prisma.entityRepairRequest.findFirst({
      where: { id },
      include: {
        operator: true,
        supervisor: true,
        projectManager: true,
      },
    });
    await this.checkEntityAssignmentOrPermission(
      repair.entityId,
      user.id,
      undefined,
      ['Admin', 'Engineer'],
      ['MODIFY_REPAIR_REQUEST']
    );
    try {
      if (repair.internal != internal) {
        await this.createEntityHistoryInBackground({
          type: 'Repair Request Edit',
          description: `(${id}) Type changed from ${
            repair.internal ? 'Internal' : 'External'
          } to ${internal ? 'Internal' : 'External'}.`,
          entityId: repair.entityId,
          completedById: user.id,
        });
      }
      if (repair.projectName != projectName) {
        await this.createEntityHistoryInBackground({
          type: 'Repair Request Edit',
          description: `(${id}) Project name changed from ${repair.projectName} to ${projectName}.`,
          entityId: repair.entityId,
          completedById: user.id,
        });
      }
      if (repair.reason != reason) {
        await this.createEntityHistoryInBackground({
          type: 'Repair Request Edit',
          description: `(${id}) Reason changed from ${repair.reason} to ${reason}.`,
          entityId: repair.entityId,
          completedById: user.id,
        });
      }
      if (repair.additionalInfo != additionalInfo) {
        await this.createEntityHistoryInBackground({
          type: 'Repair Request Edit',
          description: `(${id}) Additional Info changed from ${repair.additionalInfo} to ${additionalInfo}.`,
          entityId: repair.entityId,
          completedById: user.id,
        });
      }
      if (repair.additionalInfo != additionalInfo) {
        await this.createEntityHistoryInBackground({
          type: 'Repair Request Edit',
          description: `(${id}) Attend Info changed from ${repair.additionalInfo} to ${attendInfo}.`,
          entityId: repair.entityId,
          completedById: user.id,
        });
      }
      if (repair.operatorId != operatorId) {
        const user2 = await this.prisma.user.findFirst({
          where: { id: operatorId },
          select: {
            fullName: true,
            rcno: true,
          },
        });
        await this.createEntityHistoryInBackground({
          type: 'Repair Request Edit',
          description: `(${id}) Operator changed from ${repair.operator?.fullName} (${repair.operator?.rcno}) to ${user2?.fullName} (${user2?.rcno}).`,
          entityId: repair.entityId,
          completedById: user.id,
        });
      }
      if (repair.supervisorId != supervisorId) {
        const user2 = await this.prisma.user.findFirst({
          where: { id: supervisorId },
          select: {
            fullName: true,
            rcno: true,
          },
        });
        await this.createEntityHistoryInBackground({
          type: 'Repair Request Edit',
          description: `(${id}) Supervisor changed from ${repair.supervisor?.fullName} (${repair.supervisor?.rcno}) to ${user2?.fullName} (${user2?.rcno}).`,
          entityId: repair.entityId,
          completedById: user.id,
        });
      }
      if (repair.projectManagerId != projectManagerId) {
        const user2 = await this.prisma.user.findFirst({
          where: { id: projectManagerId },
          select: {
            fullName: true,
            rcno: true,
          },
        });
        await this.createEntityHistoryInBackground({
          type: 'Repair Request Edit',
          description: `(${id}) Project Manager changed from ${repair.projectManager?.fullName} (${repair.projectManager?.rcno}) to ${user2?.fullName} (${user2?.rcno}).`,
          entityId: repair.entityId,
          completedById: user.id,
        });
      }
      const users = await this.getEntityAssignmentIds(repair.entityId, user.id);
      for (let index = 0; index < users.length; index++) {
        await this.notificationService.createInBackground({
          userId: users[index],
          body: `${user.fullName} (${user.rcno}) edited repair (${repair.id}) on entity ${repair.entityId}`,
          link: `/entity/${repair.entityId}`,
        });
      }
      await this.prisma.entityRepairRequest.update({
        where: { id },
        data: {
          internal,
          projectName,
          location,
          reason,
          additionalInfo,
          attendInfo,
          operatorId,
          supervisorId,
          projectManagerId,
        },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Delete entity repair request. */
  async deleteEntityRepairRequest(user: User, id: number) {
    const repair = await this.prisma.entityRepairRequest.findFirst({
      where: { id },
      select: {
        id: true,
        entityId: true,
        projectName: true,
      },
    });
    await this.checkEntityAssignmentOrPermission(
      repair.entityId,
      user.id,
      undefined,
      ['Admin'],
      ['MODIFY_REPAIR_REQUEST']
    );
    try {
      await this.createEntityHistoryInBackground({
        type: 'Repair Delete',
        description: `(${id}) Repair Request (Project Name: ${repair.projectName}) deleted.`,
        entityId: repair.entityId,
        completedById: user.id,
      });
      const users = await this.getEntityAssignmentIds(repair.entityId, user.id);
      for (let index = 0; index < users.length; index++) {
        await this.notificationService.createInBackground({
          userId: users[index],
          body: `${user.fullName} (${user.rcno}) deleted repair (${repair.id}) on entity ${repair.entityId}`,
          link: `/entity/${repair.entityId}`,
        });
      }
      await this.prisma.entityRepairRequest.delete({
        where: { id },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Get entity Repair Request. Results are paginated. User cursor argument to go forward/backward. */
  async getEntityRepairRequestWithPagination(
    user: User,
    args: EntityRepairConnectionArgs
  ): Promise<PaginatedEntityRepair> {
    try {
      const { limit, offset } = getPagingParameters(args);
      const limitPlusOne = limit + 1;
      const { entityId, search, approve, complete } = args;

      // eslint-disable-next-line prefer-const
      let where: any = { AND: [] };
      if (entityId) {
        where.AND.push({ entityId });
      }
      if (search) {
        const or: any = [
          { projectName: { contains: search, mode: 'insensitive' } },
        ];
        // If search contains all numbers, search the machine ids as well
        if (/^(0|[1-9]\d*)$/.test(search)) {
          or.push({ id: parseInt(search) });
        }
        where.AND.push({
          OR: or,
        });
      }
      if (approve) {
        where.AND.push({
          NOT: [{ approvedAt: null }],
        });
      }
      if (complete) {
        where.AND.push({
          NOT: [{ repairedAt: null }],
        });
      }
      const repair = await this.prisma.entityRepairRequest.findMany({
        skip: offset,
        take: limitPlusOne,
        where,
        orderBy: { id: 'desc' },
        include: {
          requestedBy: true,
          supervisor: true,
          projectManager: true,
          approvedBy: true,
          operator: true,
          repairedBy: true,
        },
      });

      const count = await this.prisma.entityRepairRequest.count({ where });
      const { edges, pageInfo } = connectionFromArraySlice(
        repair.slice(0, limit),
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

  //** Get entity history. Results are paginated. User cursor argument to go forward/backward. */
  async getEntityHistoryWithPagination(
    user: User,
    args: EntityHistoryConnectionArgs
  ): Promise<PaginatedEntityHistory> {
    try {
      const { limit, offset } = getPagingParameters(args);
      const limitPlusOne = limit + 1;
      const { search, entityId, locationIds, from, to } = args;
      const fromDate = moment(from).startOf('day');
      const toDate = moment(to).endOf('day');

      // eslint-disable-next-line prefer-const
      let where: any = { AND: [] };

      if (entityId) {
        where.AND.push({ entityId });
      }
      if (locationIds?.length > 0) {
        where.AND.push({
          locationId: {
            in: locationIds,
          },
        });
      }

      if (from && to) {
        where.AND.push({
          createdAt: { gte: fromDate.toDate(), lte: toDate.toDate() },
        });
      }
      //for now these only
      if (search) {
        const or: any = [
          { type: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
        // If search contains all numbers, search the entity ids as well
        if (/^(0|[1-9]\d*)$/.test(search)) {
          or.push({ id: parseInt(search) });
        }
        where.AND.push({
          OR: or,
        });
      }
      const history = await this.prisma.entityHistory.findMany({
        skip: offset,
        take: limitPlusOne,
        where,
        include: {
          completedBy: true,
          location: true,
        },
        orderBy: { id: 'desc' },
      });

      const count = await this.prisma.entityHistory.count({ where });
      const { edges, pageInfo } = connectionFromArraySlice(
        history.slice(0, limit),
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

  //** Assign 'user' to entity and return transactions. Meant to be used with the bulk assign function in assignment.service */
  async assignUserToEntityTransactions(
    user: User,
    entityId: number,
    type: string,
    userIds: number[]
  ): Promise<
    [PrismaPromise<Prisma.BatchPayload>, Promise<void>[], Promise<void>[]]
  > {
    try {
      const entity = await this.prisma.entity.findFirst({
        where: { id: entityId },
        include: { type: true },
      });
      if (!entity) {
        throw new BadRequestException('Invalid entity.');
      }

      // Filter out existing assignments of type
      const existingAssignmentIds = await this.getEntityAssignmentIds(
        entityId,
        undefined,
        type
      );
      const newIds = userIds.filter(
        (id) => !existingAssignmentIds.includes(id)
      );
      if (newIds.length === 0) {
        return [null, [], []];
      }
      const newAssignments = await this.prisma.user.findMany({
        where: {
          id: { in: newIds },
        },
        select: {
          id: true,
          fullName: true,
          rcno: true,
          email: true,
        },
      });

      const assignPromise = this.prisma.entityAssignment.createMany({
        data: newIds.map((userId) => ({
          entityId,
          userId,
          type,
        })),
      });

      const entityUserIds = await this.getEntityAssignmentIds(
        entityId,
        user.id
      );
      const entityUsersExceptNewAssignments = entityUserIds.filter(
        (id) => !userIds.includes(id)
      );

      const entityHistory: Promise<void>[] = [];
      // Text format new assignments into a readable list with commas and 'and'
      // at the end.
      const newAssignmentsFormatted = newAssignments
        .map((a) => `${a.fullName} (${a.rcno})`)
        .join(', ')
        .replace(/, ([^,]*)$/, ' and $1');

      entityHistory.push(
        this.createEntityHistoryInBackground({
          type: 'User Assign',
          description: `${newAssignmentsFormatted} assigned as ${type}.`,
          entityId: entityId,
          completedById: user.id,
        })
      );

      const notifications: Promise<void>[] = [];
      // Notification to entity assigned users except new assignments
      for (const id of entityUsersExceptNewAssignments) {
        notifications.push(
          this.notificationService.createInBackground({
            userId: id,
            body: `${user.fullName} (${
              user.rcno
            }) assigned ${newAssignmentsFormatted} to ${
              `${entity.type?.name} ` ?? ''
            }${entity.machineNumber} as ${type}.`,
            link: `/entity/${entityId}`,
          })
        );
      }

      // Notification to new assignments
      const newAssignmentsWithoutCurrentUser = newAssignments.filter(
        (na) => na.id !== user.id
      );
      const emailBody = `You have been assigned to ${
        `${entity.type?.name} ` ?? ''
      }${entity.machineNumber} as ${type}.`;
      for (const newAssignment of newAssignmentsWithoutCurrentUser) {
        notifications.push(
          this.notificationService.createInBackground({
            userId: newAssignment.id,
            body: emailBody,
            link: `/entity/${entityId}`,
          })
        );
      }
      return [assignPromise, notifications, entityHistory];
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Unassign 'user' from entity and return transactions. Meant to be used with the bulk unassign function in assignment.service */
  async unassignUserToEntityTransactions(
    user: User,
    entityId: number,
    type: string,
    userIds: number[]
  ): Promise<
    [PrismaPromise<Prisma.BatchPayload>, Promise<void>[], Promise<void>[]]
  > {
    try {
      const entity = await this.prisma.entity.findFirst({
        where: { id: entityId },
        include: { type: true },
      });
      if (!entity) {
        throw new BadRequestException('Invalid entity.');
      }

      // Filter out existing assignments of type
      const existingAssignmentIds = await this.getEntityAssignmentIds(
        entityId,
        undefined,
        type
      );
      const existingIds = userIds.filter((id) =>
        existingAssignmentIds.includes(id)
      );
      if (existingIds.length === 0) {
        return [null, [], []];
      }
      const newUnassignments = await this.prisma.user.findMany({
        where: {
          id: { in: existingIds },
        },
        select: {
          id: true,
          fullName: true,
          rcno: true,
          email: true,
        },
      });

      const unassignPromise = this.prisma.entityAssignment.updateMany({
        where: { entityId, userId: { in: existingIds } },
        data: {
          removedAt: new Date(),
        },
      });

      const entityUserIds = await this.getEntityAssignmentIds(
        entityId,
        user.id
      );
      const entityUsersExceptNewAssignments = entityUserIds.filter(
        (id) => !userIds.includes(id)
      );

      const entityHistory: Promise<void>[] = [];
      // Text format new assignments into a readable list with commas and 'and'
      // at the end.
      const newAssignmentsFormatted = newUnassignments
        .map((a) => `${a.fullName} (${a.rcno})`)
        .join(', ')
        .replace(/, ([^,]*)$/, ' and $1');

      entityHistory.push(
        this.createEntityHistoryInBackground({
          type: 'User Unassigned',
          description: `${newAssignmentsFormatted} removed as ${type}.`,
          entityId: entityId,
          completedById: user.id,
        })
      );

      const notifications: Promise<void>[] = [];
      // Notification to entity assigned users except new assignments
      for (const id of entityUsersExceptNewAssignments) {
        notifications.push(
          this.notificationService.createInBackground({
            userId: id,
            body: `${user.fullName} (${
              user.rcno
            }) removed ${newAssignmentsFormatted} from ${
              `${entity.type?.name} ` ?? ''
            }${entity.machineNumber} as ${type}.`,
            link: `/entity/${entityId}`,
          })
        );
      }

      // Notification to new assignments
      const newUnassignmentsWithoutCurrentUser = newUnassignments.filter(
        (na) => na.id !== user.id
      );
      const emailBody = `You have been removed from ${
        `${entity.type?.name} ` ?? ''
      }${entity.machineNumber} as ${type}.`;
      for (const newUnassignment of newUnassignmentsWithoutCurrentUser) {
        notifications.push(
          this.notificationService.createInBackground({
            userId: newUnassignment.id,
            body: emailBody,
            link: `/entity/${entityId}`,
          })
        );
      }
      return [unassignPromise, notifications, entityHistory];
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Assign 'user' to entity. */
  async assignUserToEntity(
    user: User,
    entityId: number,
    type: string,
    userIds: number[]
  ) {
    if (!ENTITY_ASSIGNMENT_TYPES.includes(type)) {
      throw new BadRequestException('Invalid assignment type.');
    }
    const entity = await this.prisma.entity.findFirst({
      where: { id: entityId },
      include: { type: true },
    });
    await this.checkEntityAssignmentOrPermission(
      entityId,
      user.id,
      undefined,
      ['Admin'],
      ['ASSIGN_TO_ENTITY']
    );
    if (!entity) {
      throw new BadRequestException('Invalid entity.');
    }

    // Filter out existing assignments of type
    const existingAssignmentIds = await this.getEntityAssignmentIds(
      entityId,
      undefined,
      type
    );
    const newIds = userIds.filter((id) => !existingAssignmentIds.includes(id));
    if (newIds.length === 0) {
      throw new BadRequestException('No new users assigned.');
    }
    const newAssignments = await this.prisma.user.findMany({
      where: {
        id: { in: newIds },
      },
      select: {
        id: true,
        fullName: true,
        rcno: true,
        email: true,
      },
    });
    try {
      await this.prisma.entityAssignment.createMany({
        data: newIds.map((userId) => ({
          entityId,
          userId,
          type,
        })),
      });

      const entityUserIds = await this.getEntityAssignmentIds(
        entityId,
        user.id
      );
      const entityUsersExceptNewAssignments = entityUserIds.filter(
        (id) => !userIds.includes(id)
      );
      // Text format new assignments into a readable list with commas and 'and'
      // at the end.
      const newAssignmentsFormatted = newAssignments
        .map((a) => `${a.fullName} (${a.rcno})`)
        .join(', ')
        .replace(/, ([^,]*)$/, ' and $1');

      // Create entity history entries
      await this.createEntityHistoryInBackground({
        type: 'User Assign',
        description: `${newAssignmentsFormatted} assigned as ${type}.`,
        entityId: entityId,
        completedById: user.id,
      });

      // Notification to entity assigned users except new assignments
      for (const id of entityUsersExceptNewAssignments) {
        await this.notificationService.createInBackground({
          userId: id,
          body: `${user.fullName} (${
            user.rcno
          }) assigned ${newAssignmentsFormatted} to ${
            `${entity.type?.name} ` ?? ''
          }${entity.machineNumber} as ${type}.`,
          link: `/entity/${entityId}`,
        });
      }

      // Notification to new assignments
      const newAssignmentsWithoutCurrentUser = newAssignments.filter(
        (na) => na.id !== user.id
      );
      const emailBody = `You have been assigned to ${
        `${entity.type?.name} ` ?? ''
      }${entity.machineNumber} as ${type}.`;
      for (const newAssignment of newAssignmentsWithoutCurrentUser) {
        await this.notificationService.createInBackground({
          userId: newAssignment.id,
          body: emailBody,
          link: `/entity/${entityId}`,
        });
      }
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new BadRequestException(
          `User is already assigned to this entity.`
        );
      } else {
        console.log(e);
        throw new InternalServerErrorException('Unexpected error occured.');
      }
    }
  }

  async unassignFromEntityExternal({
    requestingUserUuid,
    entityId,
    userUuid,
    type,
  }: UnassignExternalInput) {
    try {
      const user = await this.authService.validateUser(requestingUserUuid);
      if (!user) {
        throw new BadRequestException('Invalid requesting user.');
      }
      const unassign = await this.prisma.user.findFirst({
        where: {
          userId: userUuid,
        },
        select: {
          id: true,
          fullName: true,
          rcno: true,
        },
      });
      await this.prisma.entityAssignment.updateMany({
        where: { entityId, userId: unassign.id, type, removedAt: null },
        data: { removedAt: new Date() },
      });
      await this.createEntityHistoryInBackground({
        type: 'User Unassigned',
        description: `${unassign.fullName} (${unassign.rcno}) removed as ${type}.`,
        entityId: entityId,
        completedById: user.id,
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** unassign user from entity. */
  async unassignUserFromEntity(
    user: User,
    entityId: number,
    type: string,
    userId: number
  ) {
    await this.checkEntityAssignmentOrPermission(
      entityId,
      user.id,
      undefined,
      ['Admin'],
      ['ASSIGN_TO_ENTITY']
    );
    try {
      const unassign = await this.prisma.user.findFirst({
        where: {
          id: userId,
        },
        select: {
          fullName: true,
          rcno: true,
        },
      });
      await this.prisma.entityAssignment.updateMany({
        where: { entityId, userId, type, removedAt: null },
        data: { removedAt: new Date() },
      });
      await this.createEntityHistoryInBackground({
        type: 'User Unassigned',
        description: `${unassign.fullName} (${unassign.rcno}) removed as ${type}.`,
        entityId: entityId,
        completedById: user.id,
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Create Entity history */
  async createEntityHistory(entityHistory: EntityHistoryInterface) {
    try {
      const entity = await this.prisma.entity.findFirst({
        where: { id: entityHistory.entityId },
        select: {
          status: true,
          typeId: true,
          locationId: true,
          id: true,
        },
      });

      const now = moment();
      //not using these anymore but coding it anyway
      let workingHour = await this.getLatestReading(entity);
      let idleHour = 0;
      let breakdownHour = 0;
      if (workingHour < 60) {
        idleHour = 60 - workingHour;
      }

      if (entity.status === 'Breakdown' || entity.status === 'Critical') {
        const fromDate = await this.prisma.entityHistory.findFirst({
          where: {
            entityStatus: 'Working',
          },
          orderBy: {
            id: 'desc',
          },
        });
        const duration = moment.duration(now.diff(fromDate.createdAt));
        breakdownHour = parseInt(duration.asHours().toFixed(0));
        if (breakdownHour >= 60) {
          breakdownHour = 60;
          workingHour = 0;
          idleHour = 0;
        } else {
          if (workingHour < 60) {
            idleHour = 60 - workingHour - breakdownHour;
          }
        }
      }

      await this.prisma.entityHistory.create({
        data: {
          entityId: entityHistory.entityId,
          type: entityHistory.type,
          description: entityHistory.description,
          completedById: entityHistory.completedById,
          entityStatus: entityHistory.entityStatus
            ? entityHistory.entityStatus
            : entity.status,
          entityType: entityHistory.entityType,
          workingHour: await this.getLatestReading(entity),
          idleHour: idleHour,
          breakdownHour: breakdownHour,
          locationId: entity.locationId,
        },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Create entity history in background */
  async createEntityHistoryInBackground(entityHistory: EntityHistoryInterface) {
    try {
      await this.entityHistoryQueue.add('createEntityHistory', {
        entityHistory,
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Delete entity attachment. */
  async deleteEntityAttachment(id: number, user: User) {
    try {
      const attachment = await this.prisma.entityAttachment.findFirst({
        where: { id },
        select: {
          id: true,
          entityId: true,
          description: true,
        },
      });
      await this.createEntityHistoryInBackground({
        type: 'Attachment Delete',
        description: `(${id}) Attachment (${attachment.description}) deleted.`,
        entityId: attachment.entityId,
        completedById: user.id,
      });
      const users = await this.getEntityAssignmentIds(
        attachment.entityId,
        user.id
      );
      for (let index = 0; index < users.length; index++) {
        await this.notificationService.createInBackground({
          userId: users[index],
          body: `${user.fullName} (${user.rcno}) deleted attachment (${attachment.id}) on entity ${attachment.entityId}`,
          link: `/entity/${attachment.entityId}`,
        });
      }
      await this.prisma.entityAttachment.delete({
        where: { id },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Edit entity attachment */
  async editEntityAttachment(user: User, id: number, description: string) {
    try {
      const attachment = await this.prisma.entityAttachment.findFirst({
        where: { id },
        select: {
          id: true,
          entityId: true,
          description: true,
        },
      });
      if (attachment.description != description) {
        await this.createEntityHistoryInBackground({
          type: 'Attachment Edit',
          description: `(${id}) Description changed from ${attachment.description} to ${description}.`,
          entityId: attachment.entityId,
          completedById: user.id,
        });
      }
      const users = await this.getEntityAssignmentIds(
        attachment.entityId,
        user.id
      );
      for (let index = 0; index < users.length; index++) {
        await this.notificationService.createInBackground({
          userId: users[index],
          body: `${user.fullName} (${user.rcno}) edited attachment (${attachment.id}) on entity ${attachment.entityId}`,
          link: `/entity/${attachment.entityId}`,
        });
      }
      await this.prisma.entityAttachment.update({
        where: { id },
        data: { description },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  // Get unique array of ids of entity assigned users
  async getEntityAssignmentIds(
    entityId: number,
    removeUserId?: number,
    type?: string
  ): Promise<number[]> {
    try {
      const getAssignedUsers = await this.prisma.entityAssignment.findMany({
        where: {
          entityId,
          type: type ?? undefined,
          removedAt: null,
        },
      });

      const combinedIDs = [...getAssignedUsers.map((a) => a.userId)];

      // get unique ids only
      const unique = [...new Set(combinedIDs)];

      // If removeUserId variable has not been passed, return array
      if (!removeUserId) {
        return unique;
      }

      // Otherwise remove the given user id from array and then return
      return unique.filter((id) => {
        return id != removeUserId;
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Get entity usage */
  async getEntityUsage(
    user: User,
    entityId: number,
    from: Date,
    to: Date,
    entity?: Entity
  ) {
    try {
      // Start one day earlier to build up cumulative hours
      const fromDate = moment(from).startOf('day');
      const toDate = moment(to).endOf('day');
      const entityFromCheck = await this.prisma.entity.findFirst({
        where: { id: entityId },
        include: { type: true },
      });
      if (entityFromCheck?.type?.entityType === 'Machine') {
        await this.checkEntityAssignmentOrPermission(
          entityId,
          user.id,
          entity,
          [],
          ['VIEW_ALL_ENTITY', 'VIEW_ALL_MACHINERY']
        );
      } else if (entityFromCheck?.type?.entityType === 'Vehicle') {
        await this.checkEntityAssignmentOrPermission(
          entityId,
          user.id,
          entity,
          [],
          ['VIEW_ALL_ENTITY', 'VIEW_ALL_VEHICLES']
        );
      } else if (entityFromCheck?.type?.entityType === 'Vessel') {
        await this.checkEntityAssignmentOrPermission(
          entityId,
          user.id,
          entity,
          [],
          ['VIEW_ALL_ENTITY', 'VIEW_ALL_VESSELS']
        );
      }
      if (!entity) {
        entity = entityFromCheck;
      }
      const key = `usage_${entityId}_${fromDate.toISOString()}_${toDate.toISOString()}`;
      let usage = await this.redisCacheService.get(key);
      if (!usage) {
        usage = [];
        const days = toDate.diff(fromDate, 'days') + 1;
        let cumulative = 0;
        if (entity?.measurement === 'hr') {
          cumulative += await this.getLatestReading(entity, fromDate.toDate());
        }
        const breakdowns = await this.prisma.breakdown.findMany({
          where: { entityId: entity.id, type: 'Breakdown' },
          orderBy: { id: 'desc' },
        });
        for (let i = 0; i < days; i++) {
          const day = fromDate.clone().add(i, 'day');
          const dayStart = day.clone().startOf('day');
          const dayEnd = day.clone().endOf('day');
          const checklist = await this.prisma.checklist.findFirst({
            where: {
              entityId,
              type: 'Daily',
              from: dayStart.toDate(),
              to: dayEnd.toDate(),
            },
          });
          let workingHour = 0;
          let idleHour = 0;
          let breakdownHour = 0;
          let na = 0;
          if (checklist) {
            if (entity?.measurement === 'hr') {
              if (checklist.workingHour) {
                workingHour = checklist.workingHour;
              } else if (checklist.currentMeterReading) {
                workingHour = checklist.currentMeterReading - cumulative;
              } else {
                workingHour = null;
              }
            } else {
              if (checklist.dailyUsageHours) {
                workingHour = checklist?.dailyUsageHours;
              } else {
                workingHour = null;
              }
            }
          } else {
            workingHour = null;
            idleHour = null;
            breakdownHour = null;
          }
          if (workingHour !== null) {
            cumulative += workingHour;
            workingHour =
              workingHour <= 24 && workingHour >= 0 ? workingHour : 0;
            if (workingHour >= 0 && workingHour <= 10) {
              idleHour = 10 - workingHour;
            }
          } else {
            na += 10;
          }

          const now = moment();
          const bd = breakdowns.find((b) =>
            dayStart.isBetween(
              moment(b.createdAt).startOf('day'),
              b?.completedAt
                ? moment(b?.completedAt).endOf('day')
                : now.endOf('day')
            )
          );
          if (bd) {
            if (bd?.completedAt) {
              const duration = moment.duration(
                moment(bd?.completedAt).diff(bd.createdAt)
              );
              breakdownHour = parseInt(duration.asHours().toFixed(0));
            } else {
              const duration = moment.duration(now.diff(bd.createdAt));
              breakdownHour = parseInt(duration.asHours().toFixed(0));
            }

            if (breakdownHour >= 10) {
              breakdownHour = 10;
              na = 0;
              breakdownHour = breakdownHour - workingHour;
              idleHour =
                10 - workingHour - breakdownHour > 0
                  ? 10 - workingHour - breakdownHour
                  : 0;
            } else {
              if (breakdownHour > 0) {
                na = 0;
                breakdownHour = Math.abs(breakdownHour - workingHour);
                idleHour =
                  10 - workingHour - breakdownHour > 0
                    ? 10 - workingHour - breakdownHour
                    : 0;
              }
            }
          }

          usage.push({
            date: day.toDate(),
            workingHour,
            idleHour,
            breakdownHour,
            na,
          });
        }
        await this.redisCacheService.setForHour(key, usage);
      }
      return usage;
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Get entity utilization. Results are paginated. User cursor argument to go forward/backward. */
  async getEntityUtilizationWithPagination(
    user: User,
    args: EntityConnectionArgs
  ): Promise<PaginatedEntity> {
    try {
      const { limit, offset } = getPagingParameters(args);
      const limitPlusOne = limit + 1;
      const { createdById, search, assignedToId, status, locationIds } = args;

      // eslint-disable-next-line prefer-const
      let where: any = { AND: [] };
      where.AND.push({
        deletedAt: null,
        parentEntityId: null,
      });
      if (createdById) {
        where.AND.push({ createdById });
      }

      if (assignedToId) {
        where.AND.push({
          assignees: { some: { userId: assignedToId, removedAt: null } },
        });
      }

      if (status) {
        where.AND.push({ status });
      }

      if (locationIds.length > 0) {
        where.AND.push({
          locationId: {
            in: locationIds,
          },
        });
      }

      if (search) {
        const or: any = [
          { model: { contains: search, mode: 'insensitive' } },
          { machineNumber: { contains: search, mode: 'insensitive' } },
        ];
        // If search contains all numbers, search the machine ids as well
        if (/^(0|[1-9]\d*)$/.test(search)) {
          or.push({ id: parseInt(search) });
        }
        where.AND.push({
          OR: or,
        });
      }
      const entity = await this.prisma.entity.findMany({
        skip: offset,
        take: limitPlusOne,
        where,
        include: {
          histories: {
            take: 1,
            orderBy: {
              id: 'desc',
            },
          },
          type: true,
          location: {
            include: { zone: true },
          },
        },
      });

      const count = await this.prisma.entity.count({ where });
      const { edges, pageInfo } = connectionFromArraySlice(
        entity.slice(0, limit),
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

  //** Get all entity usage*/
  async getAllEntityUsage(
    user: User,
    from: Date,
    to: Date,
    locationIds: number[]
  ) {
    try {
      const usageHistoryByDate = [];

      // eslint-disable-next-line prefer-const
      let where: any = { AND: [] };
      where.AND.push({
        deletedAt: null,
        parentEntityId: null,
      });
      if (locationIds?.length > 0) {
        where.AND.push({
          locationId: {
            in: locationIds,
          },
        });
      }
      const allEntities = await this.prisma.entity.findMany({
        where,
      });
      for (const [i, entity] of allEntities.entries()) {
        const entityUsage = await this.getEntityUsage(
          user,
          entity.id,
          from,
          to,
          entity
        );
        for (const dayUsage of entityUsage) {
          if (i === 0) {
            usageHistoryByDate.push(dayUsage);
          } else {
            const day = usageHistoryByDate.find(
              (a) => a.date.getTime() === dayUsage.date.getTime()
            );
            day.workingHour += dayUsage.workingHour;
          }
        }
      }
      return usageHistoryByDate;
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Get all entity periodic maintenance. Results are paginated. User cursor argument to go forward/backward. */
  async getAllEntityPeriodicMaintenanceWithPagination(
    user: User,
    args: EntityPeriodicMaintenanceConnectionArgs
  ): Promise<PaginatedEntityPeriodicMaintenance> {
    try {
      const { limit, offset } = getPagingParameters(args);
      const limitPlusOne = limit + 1;
      const { search, locationIds } = args;

      // eslint-disable-next-line prefer-const
      let where: any = { AND: [] };

      where.createdAt = { gte: moment().toDate(), lte: moment().toDate() };

      if (locationIds?.length > 0) {
        where.AND.push({
          locationId: {
            in: locationIds,
          },
        });
      }

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
      const periodicMaintenance =
        await this.prisma.periodicMaintenance.findMany({
          skip: offset,
          take: limitPlusOne,
          where,
          include: {
            notificationReminder: true,
            tasks: {
              where: { parentTaskId: null },
              include: {
                subTasks: {
                  include: {
                    subTasks: {
                      include: {
                        completedBy: true,
                        remarks: {
                          include: {
                            createdBy: true,
                          },
                        },
                      },
                    },
                    completedBy: true,
                    remarks: {
                      include: {
                        createdBy: true,
                      },
                    },
                  },
                  orderBy: { id: 'asc' },
                },
                completedBy: true,
                remarks: {
                  include: {
                    createdBy: true,
                  },
                },
              },
              orderBy: { id: 'asc' },
            },
            verifiedBy: true,
            comments: {
              include: {
                createdBy: true,
              },
            },
          },
          orderBy: { id: 'desc' },
        });

      const count = await this.prisma.periodicMaintenance.count({
        where,
      });
      const { edges, pageInfo } = connectionFromArraySlice(
        periodicMaintenance.slice(0, limit),
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

  //** Get all entity periodic maintenance tasks. Results are paginated. User cursor argument to go forward/backward. */
  async getAllEntityPeriodicMaintenanceTasksWithPagination(
    user: User,
    args: EntityPeriodicMaintenanceConnectionArgs
  ): Promise<PaginatedEntityPeriodicMaintenanceTask> {
    try {
      const { limit, offset } = getPagingParameters(args);
      const limitPlusOne = limit + 1;
      const { search, locationIds, zoneIds, assignedToId, from, to } = args;
      const fromDate = moment(from).startOf('day');
      const toDate = moment(to).endOf('day');
      const key = `myPMTask_${user?.id}_${limit}_${offset}_${search}_${locationIds}_${zoneIds}_${from}_${to}`;
      let myPMTask = await this.redisCacheService.get(key);
      if (!myPMTask) {
        // eslint-disable-next-line prefer-const
        let where: any = { AND: [] };
        where.AND.push({
          completedAt: null,
        });
        if (assignedToId) {
          where.AND.push({
            periodicMaintenance: {
              entity: {
                assignees: { some: { userId: assignedToId, removedAt: null } },
              },
            },
          });
        }
        if (from && to) {
          const pm = await this.prisma.periodicMaintenance.findMany({
            where: {
              NOT: [{ entityId: null }],
              createdAt: { gte: fromDate.toDate(), lte: toDate.toDate() },
              type: 'Copy',
            },
            select: {
              id: true,
            },
          });

          const pmIds = pm.map((id) => id?.id);
          where.AND.push({
            periodicMaintenanceId: {
              in: pmIds,
            },
          });
        }
        if (locationIds?.length > 0) {
          where.AND.push({
            periodicMaintenance: {
              entity: {
                locationId: {
                  in: locationIds,
                },
              },
            },
          });
        }

        if (zoneIds?.length > 0) {
          where.AND.push({
            periodicMaintenance: {
              entity: { location: { zoneId: { in: zoneIds } } },
            },
          });
        }

        if (search) {
          const or: any = [
            {
              periodicMaintenance: {
                entity: {
                  machineNumber: { contains: search, mode: 'insensitive' },
                },
              },
            },
          ];
          // If search contains all numbers, search the task ids as well
          if (/^(0|[1-9]\d*)$/.test(search)) {
            or.push({ id: parseInt(search) });
          }
          where.AND.push({
            OR: or,
          });
        }
        const periodicMaintenanceTask =
          await this.prisma.periodicMaintenanceTask.findMany({
            skip: offset,
            take: limitPlusOne,
            where,
            include: {
              periodicMaintenance: {
                include: {
                  entity: {
                    include: {
                      assignees: {
                        where: {
                          removedAt: null,
                        },
                        include: {
                          user: true,
                        },
                      },
                      type: true,
                      location: { include: { zone: true } },
                    },
                  },
                },
              },
            },
            orderBy: { id: 'desc' },
          });

        const count = await this.prisma.periodicMaintenanceTask.count({
          where,
        });
        const { edges, pageInfo } = connectionFromArraySlice(
          periodicMaintenanceTask.slice(0, limit),
          args,
          {
            arrayLength: count,
            sliceStart: offset,
          }
        );
        myPMTask = {
          edges,
          pageInfo: {
            ...pageInfo,
            count,
            hasNextPage: offset + limit < count,
            hasPreviousPage: offset >= limit,
          },
        };
        await this.redisCacheService.setForHour(key, myPMTask);
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
      return myPMTask;
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Get all entity pm task status count*/
  async getAllEntityPMTaskStatusCount(
    user: User,
    args: EntityPeriodicMaintenanceConnectionArgs
  ) {
    try {
      const { search, locationIds, zoneIds, assignedToId, from, to } = args;
      const fromDate = moment(from).startOf('day');
      const toDate = moment(to).endOf('day');
      const key = `myPMTaskStatusCount_${user?.id}_${search}_${locationIds}_${zoneIds}_${from}_${to}`;
      let myPMTaskStatusCount = await this.redisCacheService.get(key);
      if (!myPMTaskStatusCount) {
        // eslint-disable-next-line prefer-const
        let where: any = { AND: [] };
        where.AND.push({
          completedAt: null,
        });

        if (search) {
          const or: any = [
            {
              periodicMaintenance: {
                entity: {
                  machineNumber: { contains: search, mode: 'insensitive' },
                },
              },
            },
          ];
          // If search contains all numbers, search the task ids as well
          if (/^(0|[1-9]\d*)$/.test(search)) {
            or.push({ id: parseInt(search) });
          }
          where.AND.push({
            OR: or,
          });
        }
        if (from && to) {
          const pm = await this.prisma.periodicMaintenance.findMany({
            where: {
              NOT: [{ entityId: null }],
              createdAt: { gte: fromDate.toDate(), lte: toDate.toDate() },
              type: 'Copy',
            },
            select: {
              id: true,
            },
          });

          const pmIds = pm.map((id) => id?.id);
          where.AND.push({
            periodicMaintenanceId: {
              in: pmIds,
            },
          });
        }
        if (assignedToId) {
          where.AND.push({
            periodicMaintenance: {
              entity: {
                assignees: { some: { userId: assignedToId, removedAt: null } },
              },
            },
          });
        }
        if (locationIds?.length > 0) {
          where.AND.push({
            periodicMaintenance: {
              entity: {
                locationId: {
                  in: locationIds,
                },
              },
            },
          });
        }

        if (zoneIds?.length > 0) {
          where.AND.push({
            periodicMaintenance: {
              entity: { location: { zoneId: { in: zoneIds } } },
            },
          });
        }
        const pmTask = await this.prisma.periodicMaintenanceTask.findMany({
          where,
        });
        let ongoing = 0;
        let completed = 0;
        pmTask?.map((e) => {
          if (e.completedAt !== null) {
            completed += 1;
          } else {
            ongoing += 1;
          }
        });
        myPMTaskStatusCount = {
          ongoing: ongoing,
          complete: completed,
        };
        await this.redisCacheService.setForHour(key, myPMTaskStatusCount);
        return myPMTaskStatusCount;
      }
      return myPMTaskStatusCount;
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async entityTransfer({
    requestingUserUuid,
    entityId,
    users,
    newLocationId,
  }: EntityTransferInput) {
    try {
      const entity = (await this.findOne(entityId, {
        location: true,
      })) as unknown as Entity & {
        location: Location;
      };
      const newLocation = await this.locationService.findOne(newLocationId);
      const user = await this.authService.validateUser(requestingUserUuid);
      const transactions: any = [
        this.prisma.entity.update({
          where: { id: entityId },
          data: { locationId: newLocationId },
        }),
      ];
      const removedAssignments = [];
      const newAssignments: EntityTransferUserInput[] = [];
      if (users) {
        for (const u of users) {
          u.user = await this.authService.validateUser(u.userUuid);
          if (!ENTITY_ASSIGNMENT_TYPES.includes(u.type)) {
            throw new BadRequestException(`Invalid assignment type: ${u.type}`);
          }
        }
        // Remove duplicates
        users = users.filter(
          (value, index, self) =>
            index ===
            self.findIndex(
              (t) => t.user.id === value.user.id && t.type === value.type
            )
        );

        // Find current assignments to find assignments to be created/removed
        const currentAssignments = await this.prisma.entityAssignment.findMany({
          where: { entityId, removedAt: null },
          include: { user: true },
        });
        for (const u of users) {
          let exists = false;
          for (const assignment of currentAssignments) {
            if (u.type === assignment.type && u.user.id === assignment.userId) {
              exists = true;
              break;
            }
          }
          if (!exists) {
            newAssignments.push(u);
          }
        }
        for (const assignment of currentAssignments) {
          let exists = false;
          for (const u of users) {
            if (u.type === assignment.type && u.user.id === assignment.userId) {
              exists = true;
              break;
            }
          }
          if (!exists) {
            removedAssignments.push(assignment);
          }
        }
        transactions.push(
          this.prisma.entityAssignment.updateMany({
            where: { id: { in: removedAssignments.map((a) => a.id) } },
            data: { removedAt: new Date() },
          }),
          this.prisma.entityAssignment.createMany({
            data: newAssignments.map((a) => ({
              entityId,
              type: a.type,
              userId: a.user.id,
            })),
          })
        );
      }

      await this.prisma.$transaction(transactions);
      if (entity.locationId != newLocationId) {
        await this.createEntityHistoryInBackground({
          type: 'Entity Edit',
          description: `Location changed${
            entity.locationId ? ` from ${entity.location.name}` : ``
          } to ${newLocation.name}.`,
          entityId,
          completedById: user.id,
        });
      }
      if (users) {
        for (const assignment of removedAssignments) {
          await this.createEntityHistoryInBackground({
            type: 'User Unassigned',
            description: `${assignment.user.fullName} (${assignment.user.rcno}) removed as ${assignment.type}.`,
            entityId: entityId,
            completedById: user.id,
          });
        }
        for (const assignment of newAssignments) {
          await this.createEntityHistoryInBackground({
            type: 'User Assign',
            description: `${assignment.user.fullName} (${assignment.user.rcno}) assigned as ${assignment.type}.`,
            entityId: entityId,
            completedById: user.id,
          });
        }
      }
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Get all entity status count*/
  async getAllEntityStatusCount(user: User, args: EntityConnectionArgs) {
    try {
      const userPermissions =
        await this.userService.getUserRolesPermissionsList(user.id);
      const hasViewAll = userPermissions.includes('VIEW_ALL_ENTITY');
      const hasViewAllMachinery =
        userPermissions.includes('VIEW_ALL_MACHINERY');
      const hasViewAllVehicles = userPermissions.includes('VIEW_ALL_VEHICLES');
      const hasViewAllVessels = userPermissions.includes('VIEW_ALL_VESSELS');
      const hasViewAllDivisionEntity = userPermissions.includes(
        'VIEW_ALL_DIVISION_ENTITY'
      );
      const {
        createdById,
        search,
        assignedToId,
        entityType,
        status,
        locationIds,
        divisionIds,
        isAssigned,
        typeIds,
        zoneIds,
        brandIds,
        engine,
        measurement,
        lteInterService,
        gteInterService,
        isIncompleteChecklistTask,
        entityIds,
      } = args;

      // eslint-disable-next-line prefer-const
      let where: any = { AND: [] };
      const todayStart = moment().startOf('day');
      const todayEnd = moment().endOf('day');

      where.AND.push({
        deletedAt: null,
      });

      if (search) {
        const or: any = [
          { model: { contains: search, mode: 'insensitive' } },
          { machineNumber: { contains: search, mode: 'insensitive' } },
        ];
        // If search contains all numbers, search the machine ids as well
        if (/^(0|[1-9]\d*)$/.test(search)) {
          or.push({ id: parseInt(search) });
        }
        where.AND.push({
          OR: or,
        });
      }

      if (createdById) {
        where.AND.push({ createdById });
      }
      if (assignedToId || !hasViewAll) {
        if (
          assignedToId ||
          (!hasViewAllMachinery &&
            entityType?.some((type) => type === 'Machine') &&
            !hasViewAllDivisionEntity)
        ) {
          where.AND.push({
            assignees: {
              some: {
                userId:
                  !hasViewAll || !hasViewAllMachinery ? user.id : assignedToId,
                removedAt: null,
              },
            },
          });
        } else if (
          assignedToId ||
          (!hasViewAllVehicles &&
            entityType?.some((type) => type === 'Vehicle') &&
            !hasViewAllDivisionEntity)
        ) {
          where.AND.push({
            assignees: {
              some: {
                userId:
                  !hasViewAll || !hasViewAllVehicles ? user.id : assignedToId,
                removedAt: null,
              },
            },
          });
        } else if (
          assignedToId ||
          (!hasViewAllVessels &&
            entityType?.some((type) => type === 'Vessel') &&
            !hasViewAllDivisionEntity)
        ) {
          where.AND.push({
            assignees: {
              some: {
                userId:
                  !hasViewAll || !hasViewAllVessels ? user.id : assignedToId,
                removedAt: null,
              },
            },
          });
        } else if (
          assignedToId ||
          (hasViewAllDivisionEntity &&
            entityType?.some((type) => type === 'Machine') &&
            !hasViewAllMachinery)
        ) {
          const userDivision = await this.prisma.divisionUsers.findMany({
            where: { userId: user.id },
          });
          const userDivisionIds = userDivision?.map((d) => d?.divisionId);
          const or: any = [
            { divisionId: { in: userDivisionIds } },
            {
              assignees: {
                some: {
                  userId:
                    !hasViewAll || !hasViewAllMachinery
                      ? user.id
                      : assignedToId,
                  removedAt: null,
                },
              },
            },
          ];
          where.AND.push({
            OR: or,
          });
        } else if (
          assignedToId ||
          (hasViewAllDivisionEntity &&
            entityType?.some((type) => type === 'Vehicle') &&
            !hasViewAllVehicles)
        ) {
          const userDivision = await this.prisma.divisionUsers.findMany({
            where: { userId: user.id },
          });
          const userDivisionIds = userDivision?.map((d) => d?.divisionId);
          const or: any = [
            { divisionId: { in: userDivisionIds } },
            {
              assignees: {
                some: {
                  userId:
                    !hasViewAll || !hasViewAllVehicles ? user.id : assignedToId,
                  removedAt: null,
                },
              },
            },
          ];
          where.AND.push({
            OR: or,
          });
        } else if (
          assignedToId ||
          (hasViewAllDivisionEntity &&
            entityType?.some((type) => type === 'Vessel') &&
            !hasViewAllVessels)
        ) {
          const userDivision = await this.prisma.divisionUsers.findMany({
            where: { userId: user.id },
          });
          const userDivisionIds = userDivision?.map((d) => d?.divisionId);
          const or: any = [
            { divisionId: { in: userDivisionIds } },
            {
              assignees: {
                some: {
                  userId:
                    !hasViewAll || !hasViewAllVessels ? user.id : assignedToId,
                  removedAt: null,
                },
              },
            },
          ];
          where.AND.push({
            OR: or,
          });
        } else if (
          assignedToId ||
          (hasViewAllDivisionEntity && !hasViewAllVessels)
        ) {
          const userDivision = await this.prisma.divisionUsers.findMany({
            where: { userId: user.id },
          });
          const userDivisionIds = userDivision?.map((d) => d?.divisionId);
          const or: any = [
            { divisionId: { in: userDivisionIds } },
            {
              assignees: {
                some: {
                  userId:
                    !hasViewAll || !hasViewAllVessels ? user.id : assignedToId,
                  removedAt: null,
                },
              },
            },
          ];
          where.AND.push({
            OR: or,
          });
        }
      }

      if (status?.length > 0) {
        where.AND.push({
          status: { in: status },
        });
      }

      if (locationIds?.length > 0) {
        where.AND.push({
          locationId: {
            in: locationIds,
          },
        });
      }

      if (zoneIds?.length > 0) {
        where.AND.push({ location: { zoneId: { in: zoneIds } } });
      }

      if (brandIds?.length > 0) {
        where.AND.push({
          brandId: {
            in: brandIds,
          },
        });
      }

      if (divisionIds?.length > 0) {
        where.AND.push({
          divisionId: {
            in: divisionIds,
          },
        });
      }

      if (isAssigned) {
        where.AND.push({
          assignees: {
            some: {
              removedAt: null,
            },
          },
        });
      }

      if (entityType?.length > 0) {
        where.AND.push({
          type: {
            entityType: {
              in: entityType,
            },
          },
        });
      }

      if (typeIds?.length > 0) {
        where.AND.push({
          typeId: { in: typeIds },
        });
      }

      if (engine?.length > 0) {
        where.AND.push({
          engine: { in: engine },
        });
      }

      if (measurement?.length > 0) {
        where.AND.push({
          measurement: { in: measurement },
        });
      }

      if (gteInterService?.replace(/\D/g, '')) {
        where.AND.push({
          interService: { gte: parseInt(gteInterService.replace(/\D/g, '')) },
        });
      }

      if (lteInterService?.replace(/\D/g, '')) {
        where.AND.push({
          interService: { lte: parseInt(lteInterService.replace(/\D/g, '')) },
        });
      }

      if (
        gteInterService?.replace(/\D/g, '') &&
        lteInterService?.replace(/\D/g, '')
      ) {
        where.AND.push({
          interService: {
            gte: parseInt(gteInterService.replace(/\D/g, '')),
            lte: parseInt(lteInterService.replace(/\D/g, '')),
          },
        });
      }

      if (isIncompleteChecklistTask) {
        const checklist = await this.prisma.checklist.findMany({
          where: {
            NOT: [{ entityId: null }],
            from: todayStart.toDate(),
            to: todayEnd.toDate(),
          },
          select: {
            id: true,
          },
        });

        const checklistIds = checklist.map((id) => id.id);

        const checklistItem = await this.prisma.checklistItem.findMany({
          where: {
            checklistId: {
              in: checklistIds,
            },
            completedAt: null,
          },
          select: {
            checklistId: true,
          },
        });
        const checklistItemIds = checklistItem.map((id) => id.checklistId);

        const entity = await this.prisma.checklist.findMany({
          where: {
            id: {
              in: checklistItemIds,
            },
          },
          select: {
            entityId: true,
          },
        });
        const entityIds = entity.map((id) => id.entityId);
        where.AND.push({
          id: {
            in: entityIds,
          },
        });
      }

      if (entityIds?.length > 0) {
        where.AND.push({
          id: { in: { entityIds } },
        });
      }
      //use cache later
      const key = `allEntityStatusCount_${user.id}_${createdById}_${search}_${assignedToId}_${entityType}_${status}_${locationIds}_${divisionIds}_${isAssigned}_${typeIds}_${zoneIds}_${brandIds}_${engine}_${measurement}_${lteInterService}_${gteInterService}_${isIncompleteChecklistTask}_${entityIds}`;
      let statusCount = await this.redisCacheService.get(key);

      if (!statusCount) {
        const entities = await this.prisma.entity.findMany({
          where,
          include: { type: true },
        });
        const total = await this.prisma.entity.findMany({
          where: { deletedAt: null },
          select: { id: true },
        });
        let working = 0;
        let critical = 0;
        let breakdown = 0;
        let dispose = 0;
        let machineWorking = 0;
        let machineCritical = 0;
        let machineBreakdown = 0;
        let machineDispose = 0;
        let vehicleWorking = 0;
        let vehicleCritical = 0;
        let vehicleBreakdown = 0;
        let vehicleDispose = 0;
        let vesselWorking = 0;
        let vesselCritical = 0;
        let vesselBreakdown = 0;
        let vesselDispose = 0;
        entities.map((e) => {
          if (e?.status === 'Working') {
            working += 1;
            if (e?.type?.entityType === 'Machine') {
              machineWorking += 1;
            } else if (e?.type?.entityType === 'Vehicle') {
              vehicleWorking += 1;
            } else if (e?.type?.entityType === 'Vessel') {
              vesselWorking += 1;
            }
          } else if (e?.status === 'Critical') {
            critical += 1;
            if (e?.type?.entityType === 'Machine') {
              machineCritical += 1;
            } else if (e?.type?.entityType === 'Vehicle') {
              vehicleCritical += 1;
            } else if (e?.type?.entityType === 'Vessel') {
              vesselCritical += 1;
            }
          } else if (e?.status === 'Breakdown') {
            breakdown += 1;
            if (e?.type?.entityType === 'Machine') {
              machineBreakdown += 1;
            } else if (e?.type?.entityType === 'Vehicle') {
              vehicleBreakdown += 1;
            } else if (e?.type?.entityType === 'Vessel') {
              vesselBreakdown += 1;
            }
          } else if (e?.status === 'Dispose') {
            dispose += 1;
            if (e?.type?.entityType === 'Machine') {
              machineDispose += 1;
            } else if (e?.type?.entityType === 'Vehicle') {
              vehicleDispose += 1;
            } else if (e?.type?.entityType === 'Vessel') {
              vesselDispose += 1;
            }
          }
        });
        statusCount = {
          working,
          critical,
          breakdown,
          dispose,
          total: total?.length > 0 ? total?.length : 0,
          machineWorking,
          machineCritical,
          machineBreakdown,
          machineDispose,
          vehicleWorking,
          vehicleCritical,
          vehicleBreakdown,
          vehicleDispose,
          vesselWorking,
          vesselCritical,
          vesselBreakdown,
          vesselDispose,
        };
        //await this.redisCacheService.setForHour(key, statusCount);
        return statusCount;
      }
      return statusCount;
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  // Pass empty array for assignment to check for any assignment
  async checkEntityAssignmentOrPermission(
    entityId: number,
    userId: number,
    entity?: Entity,
    assignments?: ('User' | 'Technician' | 'Engineer' | 'Admin')[],
    permissions?: string[]
  ): Promise<Entity> {
    try {
      if (!entity) {
        entity = await this.findOne(entityId);
      }
      let hasAssignment = true;
      if (assignments) {
        const currentAssignments = await this.prisma.entityAssignment.findMany({
          where: {
            entityId,
            userId,
            type: assignments.length === 0 ? undefined : { in: assignments },
            removedAt: null,
          },
        });
        if (currentAssignments.length === 0) hasAssignment = false;
        const currentAssignmentsArray = currentAssignments.map((a) => a.type);
        for (const assignment of assignments) {
          if (!currentAssignmentsArray.includes(assignment)) {
            hasAssignment = false;
          }
        }
      }
      let hasPermission = true;
      if (permissions) {
        const userPermissions =
          await this.userService.getUserRolesPermissionsList(userId);
        for (const permission of permissions) {
          if (!userPermissions.includes(permission)) {
            hasPermission = false;
          } else {
            hasPermission = true;
            break;
          }
        }
      }
      let hasDivisionPermission = false;
      const userPermissions =
        await this.userService.getUserRolesPermissionsList(userId);
      if (userPermissions.includes('VIEW_ALL_DIVISION_ENTITY')) {
        const entity = await this.prisma.entity.findFirst({
          where: { id: entityId },
          select: { divisionId: true },
        });
        const user = await this.prisma.divisionUsers.findMany({
          where: { userId },
          select: { divisionId: true },
        });
        user.filter((u) => {
          if (u?.divisionId === entity?.divisionId) {
            hasDivisionPermission = true;
          }
        });
      }
      if (!hasAssignment && !hasPermission && !hasDivisionPermission) {
        throw new ForbiddenException(
          'You do not have access to this resource.'
        );
      }
      return entity;
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  // Throw an error if user does not have assignment to any entity.
  async checkAllEntityAssignments(
    userId: number,
    assignments: ('User' | 'Engineer' | 'Admin')[]
  ) {
    try {
      const userAssignments = await this.prisma.entityAssignment.count({
        where: { userId, type: { in: assignments }, removedAt: null },
      });
      if (userAssignments === 0) {
        throw new ForbiddenException('You do not have access to this resource');
      }
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Set repair request as approved or unapproved. */
  async toggleApproveEntityRepairRequest(
    user: User,
    id: number,
    approve: boolean
  ) {
    try {
      const repairRequest = await this.prisma.entityRepairRequest.findFirst({
        where: {
          id,
        },
        select: {
          entityId: true,
        },
      });
      await this.prisma.entityRepairRequest.update({
        where: { id },
        data: approve
          ? { approverId: user.id, approvedAt: new Date() }
          : { approverId: null, approvedAt: null },
      });

      const users = await this.getEntityAssignmentIds(
        repairRequest.entityId,
        user.id
      );
      for (let index = 0; index < users.length; index++) {
        await this.notificationService.createInBackground({
          userId: users[index],
          body: `${user.fullName} (${user.rcno})${
            approve ? 'approved' : 'unapproved'
          } repair request (${id}) on entity ${repairRequest.entityId}`,
          link: `/entity/${repairRequest.entityId}`,
        });
      }
      await this.createEntityHistoryInBackground({
        type: 'Repair request approval',
        description: approve
          ? `Repair request (${id}) has been approved.`
          : `Repair request (${id}) has been unapproved.`,
        entityId: repairRequest.entityId,
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Set repair request as completed or not. */
  async toggleCompleteEntityRepairRequest(
    user: User,
    id: number,
    complete: boolean
  ) {
    try {
      const repairRequest = await this.prisma.entityRepairRequest.findFirst({
        where: {
          id,
        },
        select: {
          entityId: true,
        },
      });
      await this.prisma.entityRepairRequest.update({
        where: { id },
        data: complete
          ? { repairedById: user.id, repairedAt: new Date() }
          : { repairedById: null, repairedAt: null },
      });

      const users = await this.getEntityAssignmentIds(
        repairRequest.entityId,
        user.id
      );
      for (let index = 0; index < users.length; index++) {
        await this.notificationService.createInBackground({
          userId: users[index],
          body: `${user.fullName} (${user.rcno}) ${
            complete ? 'completed' : 'uncompleted'
          } repair request (${id}) on entity ${repairRequest.entityId}`,
          link: `/entity/${repairRequest.entityId}`,
        });
      }
      await this.createEntityHistoryInBackground({
        type: 'Repair request approval',
        description: complete
          ? `Repair request (${id}) has been completed.`
          : `Repair request (${id}) has been uncompleted.`,
        entityId: repairRequest.entityId,
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Get all entity breakdown count*/
  async getAllEntityBreakdownCount() {
    try {
      const key = `allEntityBreakdownCount`;
      let breakdownCount = await this.redisCacheService.get(key);

      if (!breakdownCount) {
        breakdownCount = '';

        const machine = await this.prisma.entity.findMany({
          where: {
            status: 'Breakdown',
            deletedAt: null,
            type: {
              entityType: 'Machine',
            },
          },
        });
        const vehicle = await this.prisma.entity.findMany({
          where: {
            status: 'Breakdown',
            deletedAt: null,
            type: {
              entityType: 'Vehicle',
            },
          },
        });
        const vessel = await this.prisma.entity.findMany({
          where: {
            status: 'Breakdown',
            deletedAt: null,
            type: {
              entityType: 'Vessel',
            },
          },
        });
        breakdownCount = {
          machine: machine.length ?? 0,
          vehicle: vehicle.length ?? 0,
          vessel: vessel.length ?? 0,
        };
      }
      return breakdownCount;
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** to check if assigned user has checklist or tasks to be done*/
  async getAllEntityChecklistAndPMSummary(user: User) {
    try {
      const key = `allEntityChecklistAndPMSummary_${user?.id}`;
      let checklistAndPMSummary = await this.redisCacheService.get(key);
      const todayStart = moment().startOf('day');
      const todayEnd = moment().endOf('day');

      if (!checklistAndPMSummary) {
        checklistAndPMSummary = '';
        const pm = await this.prisma.periodicMaintenance.findMany({
          where: {
            NOT: [{ entityId: null }],
            from: todayStart.toDate(),
            to: todayEnd.toDate(),
            type: 'Copy',
          },
          select: {
            id: true,
          },
        });

        const pmIds = pm.map((id) => id.id);

        const periodicMaintenanceTask =
          await this.prisma.periodicMaintenanceTask.findMany({
            where: {
              periodicMaintenanceId: {
                in: pmIds,
              },
              completedAt: null,
            },
            select: {
              periodicMaintenanceId: true,
            },
          });
        const pmTaskPMIds = periodicMaintenanceTask.map(
          (id) => id?.periodicMaintenanceId
        );

        const newPM = await this.prisma.periodicMaintenance.findMany({
          where: {
            id: {
              in: pmTaskPMIds,
            },
          },
          select: {
            id: true,
            entityId: true,
          },
        });

        const newPMIds = newPM.map((c) => c.entityId);

        const pmEntities = await this.prisma.entityAssignment.findMany({
          where: {
            entityId: {
              in: newPMIds,
            },
            userId: user.id,
            removedAt: null,
          },
          select: {
            id: true,
            entityId: true,
            entity: {
              select: {
                machineNumber: true,
              },
            },
          },
        });
        const incompletePMTaskEntity = [];
        pmEntities.map((e) => {
          incompletePMTaskEntity.push({
            id: e?.entityId,
            machineNumber: e?.entity?.machineNumber,
          });
        });
        //const incompletePMTaskEntityIds = pmEntities.map((e) => e.entityId);

        /*
        const pm = await this.prisma.periodicMaintenance.findMany({
          where: {
            from: { gte: todayStart.toDate() },
            to: { lte: todayEnd.toDate() },
            entity: {
              assignees: { some: { userId: user.id, removedAt: null } },
            },
            type: 'Copy',
          },
          include: {
            entity: {
              include: {
                type: true,
              },
            },
            tasks: {
              include: {
                subTasks: {
                  include: {
                    subTasks: true,
                  },
                },
              },
            },
          },
        });
        */
        const checklist = await this.prisma.checklist.findMany({
          where: {
            NOT: [{ entityId: null }],
            from: todayStart.toDate(),
            to: todayEnd.toDate(),
          },
          select: {
            id: true,
          },
        });

        const checklistIds = checklist.map((id) => id.id);

        const checklistItems = await this.prisma.checklistItem.findMany({
          where: {
            checklistId: {
              in: checklistIds,
            },
            completedAt: null,
          },
          select: {
            checklistId: true,
          },
        });
        const checklistItemIds = checklistItems.map((id) => id.checklistId);

        const newChecklist = await this.prisma.checklist.findMany({
          where: {
            id: {
              in: checklistItemIds,
            },
          },
          select: {
            id: true,
            entityId: true,
          },
        });

        const newChecklistEntityIds = newChecklist.map((c) => c.entityId);

        const entities = await this.prisma.entityAssignment.findMany({
          where: {
            entityId: {
              in: newChecklistEntityIds,
            },
            userId: user.id,
            removedAt: null,
          },
          select: {
            id: true,
            entityId: true,
            entity: {
              select: {
                machineNumber: true,
              },
            },
          },
        });
        const incompleteTaskEntity = [];
        entities.map((e) => {
          incompleteTaskEntity.push({
            id: e?.entityId,
            machineNumber: e?.entity?.machineNumber,
          });
        });
        //const incompleteTaskEntityIds = entities.map((e) => e.entityId);
        /*
        const checklist = await this.prisma.checklist.findMany({
          where: {
            from: todayStart.toDate(),
            to: todayEnd.toDate(),
            entity: {
              assignees: { some: { userId: user.id, removedAt: null } },
            },
            items: {
              some: {
                completedAt: null,
              },
            },
          },
          include: {
            entity: {
              include: {
                type: true,
              },
            },
          },
        });
        */
        /*
        let machineTaskComplete = false;
        let vehicleTaskComplete = false;
        let vesselTaskComplete = false;
        let machineChecklistComplete = false;
        let vehicleChecklistComplete = false;
        let vesselChecklistComplete = false;
       
        for (const p of pm) {
          if (p?.entity?.type?.entityType === 'Machine') {
            if (p?.tasks?.flat(2).every((task) => task?.completedAt === null)) {
              machineTaskComplete = true;
            }
          } else if (p?.entity?.type?.entityType === 'Vehicle') {
            if (p?.tasks?.flat(2).every((task) => task?.completedAt === null)) {
              vehicleTaskComplete = true;
            }
          } else if (p?.entity?.type?.entityType === 'Vessel') {
            if (p?.tasks?.flat(2).every((task) => task?.completedAt === null)) {
              vesselTaskComplete = true;
            }
          } else if (
            machineTaskComplete &&
            vehicleTaskComplete &&
            vesselTaskComplete
          ) {
            break;
          }
        }
        */
        /*
        for (const ck of checklist) {
          if (ck.entity.type.entityType === 'Machine') {
            machineChecklistComplete = true;
          } else if (ck.entity.type.entityType === 'Vehicle') {
            vehicleChecklistComplete = true;
          } else if (ck.entity.type.entityType === 'Vessel') {
            vesselChecklistComplete = true;
          } else if (
            machineChecklistComplete &&
            vehicleChecklistComplete &&
            vesselChecklistComplete
          ) {
            break;
          }
        }
        */
        const pmUnique = [...new Set(incompletePMTaskEntity)];
        const pmChecklistUnique = [...new Set(incompleteTaskEntity)];
        checklistAndPMSummary = {
          pm: pmUnique,
          checklist: pmChecklistUnique,
        };

        await this.redisCacheService.setForHour(key, checklistAndPMSummary);
      }
      return checklistAndPMSummary;
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Get all entity usage*/
  async getAllEntityUsageNew(
    user: User,
    from: Date,
    to: Date,
    search: string,
    locationIds: number[],
    zoneIds: number[],
    typeIds: number[],
    measurement: string[]
  ) {
    try {
      const userPermissions =
        await this.userService.getUserRolesPermissionsList(user.id);
      const hasViewAll = userPermissions.includes('VIEW_ALL_ENTITY');
      const hasViewAllMachinery =
        userPermissions.includes('VIEW_ALL_MACHINERY');
      const hasViewAllVehicles = userPermissions.includes('VIEW_ALL_VEHICLES');
      const hasViewAllVessels = userPermissions.includes('VIEW_ALL_VESSELS');
      const hasViewAllDivisionEntity = userPermissions.includes(
        'VIEW_ALL_DIVISION_ENTITY'
      );
      // eslint-disable-next-line prefer-const
      let where: any = { AND: [] };
      where.AND.push({
        deletedAt: null,
        machineNumber: { not: null },
        parentEntityId: null,
      });
      if (search) {
        const or: any = [
          { model: { contains: search, mode: 'insensitive' } },
          { machineNumber: { contains: search, mode: 'insensitive' } },
        ];
        // If search contains all numbers, search the machine ids as well
        if (/^(0|[1-9]\d*)$/.test(search)) {
          or.push({ id: parseInt(search) });
        }
        where.AND.push({
          OR: or,
        });
      }
      if (locationIds?.length > 0) {
        where.AND.push({
          locationId: {
            in: locationIds,
          },
        });
      }
      if (zoneIds?.length > 0) {
        where.AND.push({ location: { zoneId: { in: zoneIds } } });
      }
      if (typeIds?.length > 0) {
        where.AND.push({
          typeId: { in: typeIds },
        });
      }

      if (!hasViewAll) {
        const userDivision = await this.prisma.divisionUsers.findMany({
          where: { userId: user.id },
        });
        const userDivisionIds = userDivision?.map((d) => d?.divisionId);
        const or: any = [];
        if (hasViewAllMachinery) {
          or.push({ type: { entityType: 'Machine' } });
          where.AND.push({
            OR: or,
          });
        }
        if (hasViewAllVehicles) {
          or.push({ type: { entityType: 'Vehicle' } });
          where.AND.push({
            OR: or,
          });
        }
        if (hasViewAllVessels) {
          or.push({ type: { entityType: 'Vessel' } });
          where.AND.push({
            OR: or,
          });
        }
        if (hasViewAllDivisionEntity) {
          or.push(
            { divisionId: { in: userDivisionIds } },
            {
              assignees: {
                some: {
                  userId: user.id,
                  removedAt: null,
                },
              },
            }
          );

          where.AND.push({
            OR: or,
          });
        }
        if (
          !hasViewAllDivisionEntity &&
          !hasViewAllMachinery &&
          !hasViewAllVehicles &&
          !hasViewAllVessels
        ) {
          where.AND.push({
            assignees: {
              some: {
                userId: user.id,
                removedAt: null,
              },
            },
          });
        }
      }
      const allEntities = await this.prisma.entity.findMany({
        where,
        orderBy: { machineNumber: 'asc' },
      });

      const fromDate = moment(from).startOf('day');
      const toDate = moment(to).endOf('day');

      const key = `usage_${fromDate.toISOString()}_${toDate.toISOString()}${search}_${!hasViewAll}_Location${locationIds}_Zone${zoneIds}_Type${typeIds}_Measurement${measurement}`;
      let usage = await this.redisCacheService.get(key);
      if (!usage) {
        usage = [];
        //working hours don't have max, while breakdown, idle, and na have 60 hr max
        for (const entity of allEntities) {
          const days = toDate.diff(fromDate, 'days') + 1;
          let cumulative = 0;
          if (entity.measurement === 'hr') {
            cumulative += await this.getLatestReading(
              entity,
              fromDate.toDate()
            );
          }
          let workingHour = 0;
          let idleHour = 0;
          let breakdownHour = 0;
          let na = 0;
          const breakdowns = await this.prisma.breakdown.findMany({
            where: { entityId: entity.id, type: 'Breakdown' },
            orderBy: { id: 'desc' },
          });
          for (let i = 0; i < days; i++) {
            const day = fromDate.clone().add(i, 'day');
            const dayStart = day.clone().startOf('day');
            const dayEnd = day.clone().endOf('day');
            const checklist = await this.prisma.checklist.findFirst({
              orderBy: { id: 'desc' },
              where: {
                entityId: entity.id,
                type: 'Daily',
                from: dayStart.toDate(),
                to: dayEnd.toDate(),
              },
            });

            //each day max is 10 except for working hr
            let tempWorkingHour = 0;
            let tempIdleHour = 0;
            let tempBreakdownHour = 0;
            if (checklist) {
              if (entity.measurement === 'hr') {
                if (checklist.workingHour !== null) {
                  tempWorkingHour = checklist.workingHour;
                } else if (checklist.currentMeterReading !== null) {
                  tempWorkingHour = checklist.currentMeterReading - cumulative;
                } else {
                  tempWorkingHour = null;
                }
              } else {
                if (checklist.dailyUsageHours !== null) {
                  tempWorkingHour = checklist?.dailyUsageHours;
                } else {
                  tempWorkingHour = null;
                }
              }
            } else {
              tempWorkingHour = null;
              tempIdleHour = null;
              tempBreakdownHour = null;
            }
            if (tempWorkingHour !== null) {
              cumulative += tempWorkingHour;
              tempWorkingHour =
                tempWorkingHour <= 24 && tempWorkingHour >= 0
                  ? tempWorkingHour
                  : 0;
              if (tempWorkingHour >= 0 && tempWorkingHour < 10) {
                tempIdleHour = 10 - tempWorkingHour;
              }
            } else {
              na += 10;
            }
            const now = moment();
            if (tempWorkingHour < 10) {
              const bd = breakdowns.find((b) =>
                dayStart.isBetween(
                  moment(b.createdAt).startOf('day'),
                  b?.completedAt
                    ? moment(b?.completedAt).endOf('day')
                    : now.endOf('day')
                )
              );
              if (bd) {
                if (bd?.completedAt) {
                  const duration = moment.duration(
                    moment(bd?.completedAt).diff(bd.createdAt)
                  );
                  tempBreakdownHour = parseInt(duration.asHours().toFixed(0));
                } else {
                  const duration = moment.duration(now.diff(bd.createdAt));
                  tempBreakdownHour = parseInt(duration.asHours().toFixed(0));
                }

                if (tempBreakdownHour >= 10) {
                  tempBreakdownHour = 10;
                  na = 0;
                  tempBreakdownHour = tempBreakdownHour - tempWorkingHour;
                  tempIdleHour =
                    10 - tempWorkingHour - tempBreakdownHour > 0
                      ? 10 - tempWorkingHour - tempBreakdownHour
                      : 0;
                } else {
                  if (tempBreakdownHour > 0) {
                    na = 0;
                    tempBreakdownHour = Math.abs(
                      tempBreakdownHour - tempWorkingHour
                    );
                    tempIdleHour =
                      10 - tempWorkingHour - tempBreakdownHour > 0
                        ? 10 - tempWorkingHour - tempBreakdownHour
                        : 0;
                  }
                }
              }
              /*
              if (entity.status === 'Breakdown' || entity.status === 'Critical') {
                const fromDate = await this.prisma.breakdown.findFirst({
                  where: {
                    entityId: entity.id,
                    OR: [
                      {
                        createdAt: {
                          gte: dayStart.toDate(),
                          lte: dayEnd.toDate(),
                        },
                      },
                      { completedAt: null },
                    ],
                  },
                  orderBy: {
                    id: 'desc',
                  },
                });
                if (fromDate) {
                  if (fromDate?.completedAt) {
                    const duration = moment.duration(
                      moment(fromDate?.completedAt).diff(fromDate.createdAt)
                    );
                    tempBreakdownHour = parseInt(duration.asHours().toFixed(0));
                  } else {
                    const duration = moment.duration(
                      dayStart.diff(fromDate.createdAt)
                    );
                    tempBreakdownHour = parseInt(duration.asHours().toFixed(0));
                  }
  
                  if (tempBreakdownHour >= 10) {
                    console.log(fromDate.createdAt);
                    console.log(tempBreakdownHour);
                    tempBreakdownHour = 10;
                    na = 0;
                    tempBreakdownHour = tempBreakdownHour - tempWorkingHour;
                    tempIdleHour =
                      10 - tempWorkingHour - tempBreakdownHour > 0
                        ? 10 - tempWorkingHour - tempBreakdownHour
                        : 0;
                    console.log('here1');
                  } else {
                    console.log('here');
                    if (tempBreakdownHour > 0) {
                      na = 0;
                      tempBreakdownHour = Math.abs(
                        tempBreakdownHour - tempWorkingHour
                      );
                      tempIdleHour =
                        10 - tempWorkingHour - tempBreakdownHour > 0
                          ? 10 - tempWorkingHour - tempBreakdownHour
                          : 0;
                    }
                  }
                }
              }
              */
            }

            workingHour += tempWorkingHour;
            idleHour += tempIdleHour;
            breakdownHour += tempBreakdownHour;
          }
          usage.push({
            machineNumber: entity.machineNumber,
            workingHour: workingHour,
            idleHour: idleHour,
            breakdownHour: breakdownHour,
            na: na,
            total: workingHour + idleHour + breakdownHour + na,
            id: entity.id,
          });
        }
        await this.redisCacheService.setForHour(key, usage);
      }
      return usage;
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Get all grouped entity usage*/
  async getAllGroupedEntityUsage(
    user: User,
    from: Date,
    to: Date,
    search: string,
    locationIds: number[],
    zoneIds: number[],
    typeIds: number[],
    measurement: string[],
    entityTypes: string[]
  ) {
    try {
      const userPermissions =
        await this.userService.getUserRolesPermissionsList(user.id);
      const hasViewAll = userPermissions.includes('VIEW_ALL_ENTITY');
      const hasViewAllMachinery =
        userPermissions.includes('VIEW_ALL_MACHINERY');
      const hasViewAllVehicles = userPermissions.includes('VIEW_ALL_VEHICLES');
      const hasViewAllVessels = userPermissions.includes('VIEW_ALL_VESSELS');
      const hasViewAllDivisionEntity = userPermissions.includes(
        'VIEW_ALL_DIVISION_ENTITY'
      );
      // eslint-disable-next-line prefer-const
      let where: any = { AND: [] };
      where.AND.push({
        deletedAt: null,
        machineNumber: { not: null },
        parentEntityId: null,
      });
      if (search) {
        const or: any = [
          { type: { name: { contains: search, mode: 'insensitive' } } },
        ];
        // If search contains all numbers, search the machine ids as well
        if (/^(0|[1-9]\d*)$/.test(search)) {
          or.push({ id: parseInt(search) });
        }
        where.AND.push({
          OR: or,
        });
      }
      if (locationIds?.length > 0) {
        where.AND.push({
          locationId: {
            in: locationIds,
          },
        });
      }
      if (zoneIds?.length > 0) {
        where.AND.push({ location: { zoneId: { in: zoneIds } } });
      }
      if (typeIds?.length > 0) {
        where.AND.push({
          typeId: { in: typeIds },
        });
      }

      if (!hasViewAll) {
        const userDivision = await this.prisma.divisionUsers.findMany({
          where: { userId: user.id },
        });
        const userDivisionIds = userDivision?.map((d) => d?.divisionId);
        const or: any = [];
        if (hasViewAllMachinery) {
          or.push({ type: { entityType: 'Machine' } });
          where.AND.push({
            OR: or,
          });
        }
        if (hasViewAllVehicles) {
          or.push({ type: { entityType: 'Vehicle' } });
          where.AND.push({
            OR: or,
          });
        }
        if (hasViewAllVessels) {
          or.push({ type: { entityType: 'Vessel' } });
          where.AND.push({
            OR: or,
          });
        }
        if (hasViewAllDivisionEntity) {
          or.push(
            { divisionId: { in: userDivisionIds } },
            {
              assignees: {
                some: {
                  userId: user.id,
                  removedAt: null,
                },
              },
            }
          );

          where.AND.push({
            OR: or,
          });
        }
        if (
          !hasViewAllDivisionEntity &&
          !hasViewAllMachinery &&
          !hasViewAllVehicles &&
          !hasViewAllVessels
        ) {
          where.AND.push({
            assignees: {
              some: {
                userId: user.id,
                removedAt: null,
              },
            },
          });
        }
      }
      if (entityTypes?.length > 0) {
        where.AND.push({
          type: {
            entityType: { in: entityTypes },
          },
        });
      }

      const allEntities = await this.prisma.entity.findMany({
        where,
        include: { type: true },
        orderBy: { machineNumber: 'asc' },
      });

      const fromDate = moment(from).startOf('day');
      const toDate = moment(to).endOf('day');

      const key = `usage2_EntityType${entityTypes}${fromDate.toISOString()}_${toDate.toISOString()}${search}_${!hasViewAll}_Location${locationIds}_Zone${zoneIds}_Type${typeIds}_Measurement${measurement}`;
      let usage = await this.redisCacheService.get(key);
      if (!usage) {
        usage = [];
        //working hours don't have max, while breakdown, idle, and na have 60 hr max
        for (const entity of allEntities) {
          const days = toDate.diff(fromDate, 'days') + 1;
          let cumulative = 0;
          if (entity.measurement === 'hr') {
            cumulative += await this.getLatestReading(
              entity,
              fromDate.toDate()
            );
          }
          let workingHour = 0;
          let idleHour = 0;
          let breakdownHour = 0;
          let na = 0;
          const breakdowns = await this.prisma.breakdown.findMany({
            where: { entityId: entity.id, type: 'Breakdown' },
            orderBy: { id: 'desc' },
          });
          for (let i = 0; i < days; i++) {
            const day = fromDate.clone().add(i, 'day');
            const dayStart = day.clone().startOf('day');
            const dayEnd = day.clone().endOf('day');
            const checklist = await this.prisma.checklist.findFirst({
              orderBy: { id: 'desc' },
              where: {
                entityId: entity.id,
                type: 'Daily',
                from: dayStart.toDate(),
                to: dayEnd.toDate(),
              },
            });

            //each day max is 10 except for working hr
            let tempWorkingHour = 0;
            let tempIdleHour = 0;
            let tempBreakdownHour = 0;
            if (checklist) {
              if (entity.measurement === 'hr') {
                if (checklist.workingHour !== null) {
                  tempWorkingHour = checklist.workingHour;
                } else if (checklist.currentMeterReading !== null) {
                  tempWorkingHour = checklist.currentMeterReading - cumulative;
                } else {
                  tempWorkingHour = null;
                }
              } else {
                if (checklist.dailyUsageHours !== null) {
                  tempWorkingHour = checklist?.dailyUsageHours;
                } else {
                  tempWorkingHour = null;
                }
              }
            } else {
              tempWorkingHour = null;
              tempIdleHour = null;
              tempBreakdownHour = null;
            }
            if (tempWorkingHour !== null) {
              cumulative += tempWorkingHour;
              tempWorkingHour =
                tempWorkingHour <= 24 && tempWorkingHour >= 0
                  ? tempWorkingHour
                  : 0;
              if (tempWorkingHour >= 0 && tempWorkingHour < 10) {
                tempIdleHour = 10 - tempWorkingHour;
              }
            } else {
              na += 10;
            }

            const now = moment();
            const bd = breakdowns.find((b) =>
              dayStart.isBetween(
                moment(b.createdAt).startOf('day'),
                b?.completedAt
                  ? moment(b?.completedAt).endOf('day')
                  : now.endOf('day')
              )
            );
            if (bd) {
              if (bd?.completedAt) {
                const duration = moment.duration(
                  moment(bd?.completedAt).diff(bd.createdAt)
                );
                tempBreakdownHour = parseInt(duration.asHours().toFixed(0));
              } else {
                const duration = moment.duration(now.diff(bd.createdAt));
                tempBreakdownHour = parseInt(duration.asHours().toFixed(0));
              }

              if (tempBreakdownHour >= 10) {
                tempBreakdownHour = 10;
                na = 0;
                tempBreakdownHour = tempBreakdownHour - tempWorkingHour;
                tempIdleHour =
                  10 - tempWorkingHour - tempBreakdownHour > 0
                    ? 10 - tempWorkingHour - tempBreakdownHour
                    : 0;
              } else {
                if (tempBreakdownHour > 0) {
                  na = 0;
                  tempBreakdownHour = Math.abs(
                    tempBreakdownHour - tempWorkingHour
                  );
                  tempIdleHour =
                    10 - tempWorkingHour - tempBreakdownHour > 0
                      ? 10 - tempWorkingHour - tempBreakdownHour
                      : 0;
                }
              }
            }
            workingHour += tempWorkingHour;
            idleHour += tempIdleHour;
            breakdownHour += tempBreakdownHour;
          }
          usage.push({
            machineNumber: entity.machineNumber,
            typeId: entity?.typeId,
            name: entity?.type?.name,
            workingHour: workingHour,
            idleHour: idleHour,
            breakdownHour: breakdownHour,
            na: na,
          });
        }
        await this.redisCacheService.setForHour(key, usage);
      }
      const tempUsage = [];
      for (const u of usage) {
        const entities = usage.filter(
          (a) => a.typeId === u.typeId && a.name === u.name
        );

        const count = usage.filter(
          (a) => a.typeId === u.typeId && a.name === u.name
        ).length;

        const workingHour = entities.reduce(function (prev, cur) {
          return prev + cur.workingHour;
        }, 0);
        const idleHour = entities.reduce(function (prev, cur) {
          return prev + cur.idleHour;
        }, 0);
        const breakdownHour = entities.reduce(function (prev, cur) {
          return prev + cur.breakdownHour;
        }, 0);
        const na = entities.reduce(function (prev, cur) {
          return prev + cur.na;
        }, 0);

        tempUsage.push({
          machineNumber: u?.machineNumber,
          typeId: u?.typeId,
          name: u?.name,
          workingHour: workingHour,
          idleHour: idleHour,
          breakdownHour: breakdownHour,
          na: na,
          total: workingHour + idleHour + breakdownHour + na,
          count: count,
        });
      }
      const result = Object.values(
        tempUsage.reduce((acc, obj) => ({ ...acc, [obj.typeId]: obj }), {})
      );
      //console.log(result);
      //console.log(result.length);
      return result;
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }
  //** Get all entity. */
  async getAllEntityWithoutPagination(
    user: User,
    args: EntityConnectionArgs
  ): Promise<EntityModel[]> {
    try {
      const userPermissions =
        await this.userService.getUserRolesPermissionsList(user.id);
      const hasViewAll = userPermissions.includes('VIEW_ALL_ENTITY');
      const hasViewAllMachinery =
        userPermissions.includes('VIEW_ALL_MACHINERY');
      const hasViewAllVehicles = userPermissions.includes('VIEW_ALL_VEHICLES');
      const hasViewAllVessels = userPermissions.includes('VIEW_ALL_VESSELS');
      const hasViewAllDivisionEntity = userPermissions.includes(
        'VIEW_ALL_DIVISION_ENTITY'
      );
      const {
        search,
        assignedToId,
        locationIds,
        typeIds,
        zoneIds,
        measurement,
      } = args;

      // eslint-disable-next-line prefer-const
      let where: any = { AND: [] };
      where.AND.push({
        deletedAt: null,
        machineNumber: { not: null },
        parentEntityId: null,
      });

      if (search) {
        const or: any = [
          { model: { contains: search, mode: 'insensitive' } },
          { machineNumber: { contains: search, mode: 'insensitive' } },
        ];
        // If search contains all numbers, search the machine ids as well
        if (/^(0|[1-9]\d*)$/.test(search)) {
          or.push({ id: parseInt(search) });
        }
        where.AND.push({
          OR: or,
        });
      }

      if (!hasViewAll) {
        const userDivision = await this.prisma.divisionUsers.findMany({
          where: { userId: user.id },
        });
        const userDivisionIds = userDivision?.map((d) => d?.divisionId);
        const or: any = [];
        if (hasViewAllMachinery) {
          or.push({ type: { entityType: 'Machine' } });
          where.AND.push({
            OR: or,
          });
        }
        if (hasViewAllVehicles) {
          or.push({ type: { entityType: 'Vehicle' } });
          where.AND.push({
            OR: or,
          });
        }
        if (hasViewAllVessels) {
          or.push({ type: { entityType: 'Vessel' } });
          where.AND.push({
            OR: or,
          });
        }
        if (hasViewAllDivisionEntity) {
          or.push(
            { divisionId: { in: userDivisionIds } },
            {
              assignees: {
                some: {
                  userId: user.id,
                  removedAt: null,
                },
              },
            }
          );

          where.AND.push({
            OR: or,
          });
        }
        if (
          !hasViewAllDivisionEntity &&
          !hasViewAllMachinery &&
          !hasViewAllVehicles &&
          !hasViewAllVessels
        ) {
          where.AND.push({
            assignees: {
              some: {
                userId: user.id,
                removedAt: null,
              },
            },
          });
        }
      }

      if (locationIds?.length > 0) {
        where.AND.push({
          locationId: {
            in: locationIds,
          },
        });
      }

      if (zoneIds?.length > 0) {
        where.AND.push({ location: { zoneId: { in: zoneIds } } });
      }

      if (typeIds?.length > 0) {
        where.AND.push({
          typeId: { in: typeIds },
        });
      }

      if (measurement?.length > 0) {
        where.AND.push({
          measurement: { in: measurement },
        });
      }

      const key = `usage_entities_${search}_${
        assignedToId || !hasViewAll
      }_Location${locationIds}_Zone${zoneIds}_Type${typeIds}_Measurement${measurement}`;
      const entitiesCache = await this.redisCacheService.get(key);
      if (!entitiesCache) {
        const entities = await this.prisma.entity.findMany({
          where,
          include: {
            createdBy: true,
            sparePRs: {
              orderBy: { id: 'desc' },
              where: { completedAt: null },
              include: { sparePRDetails: true },
            },
            breakdowns: {
              orderBy: { id: 'desc' },
              where: { completedAt: null },
              include: {
                createdBy: true,
                details: { include: { repairs: true } },
                repairs: { include: { breakdownDetail: true } },
              },
            },
            assignees: {
              include: {
                user: true,
              },
              where: {
                removedAt: null,
              },
            },
            brand: true,
            type: true,
            location: { include: { zone: true } },
            repairs: {
              orderBy: { id: 'desc' },
              where: { breakdownId: null, breakdownDetailId: null },
              take: 10,
            },
            division: true,
          },
          orderBy: { machineNumber: 'asc' },
        });
        for (const entity of entities) {
          const reading = await this.getLatestReading(entity);
          entity.currentRunning = reading;
        }
        await this.redisCacheService.setForHour(key, entitiesCache);
        return entities as unknown as EntityModel[];
      }

      return entitiesCache;
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async updateEntityNote(user: User, id: number, note: string) {
    try {
      await this.prisma.entity.update({
        where: { id },
        data: {
          note: note.length > 0 ? note.trim() : null,
        },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async assignSubEntityToEntity(
    user: User,
    id: number,
    parentEntityId: number
  ) {
    try {
      await this.prisma.entity.update({
        where: { id },
        data: { parentEntityId },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Get all grouped location's incomplete tasks*/
  async getAllGroupedLocationIncompleteTasks(
    user: User,
    from: Date,
    to: Date,
    search: string,
    divisionIds: number[],
    locationIds: number[],
    zoneIds: number[],
    typeIds: number[],
    measurement: string[],
    entityType: string[]
  ) {
    try {
      const userPermissions =
        await this.userService.getUserRolesPermissionsList(user.id);
      const hasViewAll = userPermissions.includes('VIEW_ALL_ENTITY');
      const hasViewAllMachinery =
        userPermissions.includes('VIEW_ALL_MACHINERY');
      const hasViewAllVehicles = userPermissions.includes('VIEW_ALL_VEHICLES');
      const hasViewAllVessels = userPermissions.includes('VIEW_ALL_VESSELS');
      const hasViewAllDivisionEntity = userPermissions.includes(
        'VIEW_ALL_DIVISION_ENTITY'
      );
      // eslint-disable-next-line prefer-const
      let where: any = { AND: [] };
      where.AND.push({
        deletedAt: null,
        machineNumber: { not: null },
        parentEntityId: null,
      });
      if (search) {
        const or: any = [
          { location: { name: { contains: search, mode: 'insensitive' } } },
        ];
        // If search contains all numbers, search the machine ids as well
        if (/^(0|[1-9]\d*)$/.test(search)) {
          or.push({ id: parseInt(search) });
        }
        where.AND.push({
          OR: or,
        });
      }
      if (divisionIds?.length > 0) {
        where.AND.push({
          divisionId: {
            in: divisionIds,
          },
        });
      }
      if (locationIds?.length > 0) {
        where.AND.push({
          locationId: {
            in: locationIds,
          },
        });
      }
      if (zoneIds?.length > 0) {
        where.AND.push({ location: { zoneId: { in: zoneIds } } });
      }
      if (typeIds?.length > 0) {
        where.AND.push({
          typeId: { in: typeIds },
        });
      }

      if (!hasViewAll) {
        const userDivision = await this.prisma.divisionUsers.findMany({
          where: { userId: user.id },
        });
        const userDivisionIds = userDivision?.map((d) => d?.divisionId);
        const or: any = [];
        if (hasViewAllMachinery) {
          or.push({ type: { entityType: 'Machine' } });
          where.AND.push({
            OR: or,
          });
        }
        if (hasViewAllVehicles) {
          or.push({ type: { entityType: 'Vehicle' } });
          where.AND.push({
            OR: or,
          });
        }
        if (hasViewAllVessels) {
          or.push({ type: { entityType: 'Vessel' } });
          where.AND.push({
            OR: or,
          });
        }
        if (hasViewAllDivisionEntity) {
          or.push(
            { divisionId: { in: userDivisionIds } },
            {
              assignees: {
                some: {
                  userId: user.id,
                  removedAt: null,
                },
              },
            }
          );

          where.AND.push({
            OR: or,
          });
        }
        if (
          !hasViewAllDivisionEntity &&
          !hasViewAllMachinery &&
          !hasViewAllVehicles &&
          !hasViewAllVessels
        ) {
          where.AND.push({
            assignees: {
              some: {
                userId: user.id,
                removedAt: null,
              },
            },
          });
        }
      }
      if (entityType?.length > 0) {
        where.AND.push({
          type: {
            entityType: { in: entityType },
          },
        });
      }

      const allEntities = await this.prisma.entity.findMany({
        where,
        include: { location: true },
        orderBy: { machineNumber: 'asc' },
      });

      const fromDate = moment(from).startOf('day');
      const toDate = moment(to).endOf('day');
      const key = `grouped_incomplete_tasks_EntityType${entityType}${fromDate.toISOString()}_${toDate.toISOString()}${search}_${!hasViewAll}_Location${locationIds}_Zone${zoneIds}_Type${typeIds}_Measurement${measurement}`;
      let stats = await this.redisCacheService.get(key);
      if (!stats) {
        stats = [];
        const checklists = await this.prisma.checklist.findMany({
          where: {
            type: 'Daily',
            NOT: [{ entityId: null }],
            from: { gte: moment(from).startOf('day').toDate() },
            to: { lte: moment(to).endOf('day').toDate() },
          },
          select: {
            id: true,
            entityId: true,
            from: true,
            to: true,
          },
        });

        const checklistIds = checklists.map((id) => id.id);
        const checklistItems = await this.prisma.checklistItem.findMany({
          where: { checklistId: { in: checklistIds } },
          select: { checklistId: true, completedAt: true },
        });
        for (const entity of allEntities) {
          let completeTask = 0;
          let incompleteTask = 0;
          const days = toDate.diff(fromDate, 'days') + 1;
          for (let i = 0; i < days; i++) {
            const day = fromDate.clone().add(i, 'day');
            const dayStart = day.clone().startOf('day');
            const dayEnd = day.clone().endOf('day');

            const checklist = checklists.find(
              (c) =>
                c.entityId === entity.id &&
                moment(c.from).startOf('day').isSame(dayStart.toDate()) &&
                moment(c.to).endOf('day').isSame(dayEnd.toDate())
            );
            const ckItems = checklistItems.filter(
              (ci) => ci.checklistId === checklist?.id
            );
            ckItems.map((ci) => {
              if (ci?.completedAt !== null) {
                completeTask = completeTask + 1;
              } else {
                incompleteTask = incompleteTask + 1;
              }
            });
          }
          stats.push({
            locationId: entity?.locationId,
            name: entity?.location?.name,
            incompleteTask,
            completeTask,
          });
        }

        await this.redisCacheService.setForHour(key, stats);
      }
      const tempUsage = [];
      for (const u of stats) {
        const entities = stats.filter((a) => a?.locationId === u?.locationId);

        const count = stats.filter(
          (a) => a?.locationId === u?.locationId
        ).length;

        const incompleteTask = entities.reduce(function (prev, cur) {
          return prev + cur.incompleteTask;
        }, 0);
        const completeTask = entities.reduce(function (prev, cur) {
          return prev + cur.completeTask;
        }, 0);
        tempUsage.push({
          locationId: u?.locationId,
          name: u?.name,
          incompleteTask,
          completeTask,
          count,
          total: incompleteTask + completeTask,
        });
      }
      const result = Object.values(
        tempUsage.reduce((acc, obj) => ({ ...acc, [obj?.locationId]: obj }), {})
      );
      //console.log(result);
      //console.log(result.length);
      return result;
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Get all grouped type's repair stats*/
  async getAllGroupedTypeRepairStats(
    user: User,
    from: Date,
    to: Date,
    search: string,
    divisionIds: number[],
    locationIds: number[],
    zoneIds: number[],
    typeIds: number[],
    measurement: string[],
    entityType: string[]
  ) {
    try {
      const userPermissions =
        await this.userService.getUserRolesPermissionsList(user.id);
      const hasViewAll = userPermissions.includes('VIEW_ALL_ENTITY');
      const hasViewAllMachinery =
        userPermissions.includes('VIEW_ALL_MACHINERY');
      const hasViewAllVehicles = userPermissions.includes('VIEW_ALL_VEHICLES');
      const hasViewAllVessels = userPermissions.includes('VIEW_ALL_VESSELS');
      const hasViewAllDivisionEntity = userPermissions.includes(
        'VIEW_ALL_DIVISION_ENTITY'
      );
      // eslint-disable-next-line prefer-const
      let where: any = { AND: [] };
      where.AND.push({
        deletedAt: null,
        machineNumber: { not: null },
        parentEntityId: null,
      });
      if (search) {
        const or: any = [
          { type: { name: { contains: search, mode: 'insensitive' } } },
        ];
        // If search contains all numbers, search the machine ids as well
        if (/^(0|[1-9]\d*)$/.test(search)) {
          or.push({ id: parseInt(search) });
        }
        where.AND.push({
          OR: or,
        });
      }
      if (divisionIds?.length > 0) {
        where.AND.push({
          divisionId: {
            in: divisionIds,
          },
        });
      }
      if (locationIds?.length > 0) {
        where.AND.push({
          locationId: {
            in: locationIds,
          },
        });
      }
      if (zoneIds?.length > 0) {
        where.AND.push({ location: { zoneId: { in: zoneIds } } });
      }
      if (typeIds?.length > 0) {
        where.AND.push({
          typeId: { in: typeIds },
        });
      }

      if (!hasViewAll) {
        const userDivision = await this.prisma.divisionUsers.findMany({
          where: { userId: user.id },
        });
        const userDivisionIds = userDivision?.map((d) => d?.divisionId);
        const or: any = [];
        if (hasViewAllMachinery) {
          or.push({ type: { entityType: 'Machine' } });
          where.AND.push({
            OR: or,
          });
        }
        if (hasViewAllVehicles) {
          or.push({ type: { entityType: 'Vehicle' } });
          where.AND.push({
            OR: or,
          });
        }
        if (hasViewAllVessels) {
          or.push({ type: { entityType: 'Vessel' } });
          where.AND.push({
            OR: or,
          });
        }
        if (hasViewAllDivisionEntity) {
          or.push(
            { divisionId: { in: userDivisionIds } },
            {
              assignees: {
                some: {
                  userId: user.id,
                  removedAt: null,
                },
              },
            }
          );

          where.AND.push({
            OR: or,
          });
        }
        if (
          !hasViewAllDivisionEntity &&
          !hasViewAllMachinery &&
          !hasViewAllVehicles &&
          !hasViewAllVessels
        ) {
          where.AND.push({
            assignees: {
              some: {
                userId: user.id,
                removedAt: null,
              },
            },
          });
        }
      }
      if (entityType?.length > 0) {
        where.AND.push({
          type: {
            entityType: { in: entityType },
          },
        });
      }

      const allEntities = await this.prisma.entity.findMany({
        where,
        include: { type: true },
        orderBy: { machineNumber: 'asc' },
      });

      const fromDate = moment(from).startOf('day');
      const toDate = moment(to).endOf('day');
      const key = `grouped_type_repair_stats_EntityType${entityType}${fromDate.toISOString()}_${toDate.toISOString()}${search}_${!hasViewAll}_Location${locationIds}_Zone${zoneIds}_Type${typeIds}_Measurement${measurement}`;
      let stats = await this.redisCacheService.get(key);
      if (!stats) {
        stats = [];
        const repairs = await this.prisma.repair.findMany({
          where: {
            createdAt: {
              gte: moment(from).startOf('day').toDate(),
              lte: moment(to).endOf('day').toDate(),
            },
          },
          include: { breakdown: true },
        });

        for (const entity of allEntities) {
          let averageTimeOfRepair = 0;
          let total = 0;
          let reading = 0;
          let mean = 0;
          const days = toDate.diff(fromDate, 'days') + 1;
          for (let i = 0; i < days; i++) {
            const day = fromDate.clone().add(i, 'day');
            const dayStart = day.clone().startOf('day');
            const dayEnd = day.clone().endOf('day');

            const repairsOfEntity = repairs.filter(
              (r) =>
                r.entityId === entity.id &&
                moment(r.createdAt).isBetween(
                  dayStart.toDate(),
                  dayEnd.toDate()
                )
            );
            if (repairsOfEntity.length > 0) {
              for (const r of repairsOfEntity) {
                if (r?.breakdown?.completedAt) {
                  const duration = moment.duration(
                    moment(r.createdAt).diff(r.breakdown.createdAt)
                  );
                  const durationHour = parseInt(duration.asHours().toFixed(0));
                  const finalDuration = durationHour / repairsOfEntity.length;
                  averageTimeOfRepair += finalDuration;
                }
              }
              total = await this.getLatestReading(entity);
              const entityReading = await this.getLatestReading(
                entity,
                dayEnd.toDate()
              );
              reading += entityReading;
              mean = reading / repairsOfEntity.length;
            }
          }
          stats.push({
            typeId: entity?.type?.id,
            name: entity?.type?.name,
            averageTimeOfRepair,
            mean,
            total,
          });
        }

        await this.redisCacheService.setForHour(key, stats);
      }
      const tempUsage = [];
      for (const u of stats) {
        const entities = stats.filter((a) => a?.typeId === u?.typeId);

        const count = stats.filter((a) => a?.typeId === u?.typeId).length;

        const averageTimeOfRepair = entities.reduce(function (prev, cur) {
          return prev + cur.averageTimeOfRepair;
        }, 0);
        const mean = entities.reduce(function (prev, cur) {
          return prev + cur.mean;
        }, 0);
        const total = entities.reduce(function (prev, cur) {
          return prev + cur.total;
        }, 0);
        tempUsage.push({
          typeId: u?.typeId,
          name: u?.name,
          averageTimeOfRepair: Math.ceil(averageTimeOfRepair),
          mean: Math.ceil(mean),
          count,
          total,
        });
      }
      const result = Object.values(
        tempUsage.reduce((acc, obj) => ({ ...acc, [obj?.typeId]: obj }), {})
      );
      return result;
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async toggleEntityTransit(user: User, id: number, complete: boolean) {
    try {
      await this.prisma.entity.update({
        where: { id },
        data: complete ? { transit: true } : { transit: false },
      });

      const users = await this.getEntityAssignmentIds(id, user.id);
      for (let index = 0; index < users.length; index++) {
        await this.notificationService.createInBackground({
          userId: users[index],
          body: `${user.fullName} (${user.rcno}) ${
            complete
              ? `Location transition started on entity (${id})`
              : `Location transition finished on entity (${id})`
          }`,
          link: `/entity/${id}`,
        });
      }
      if (complete) {
        await this.createEntityHistoryInBackground({
          type: 'Transition start',
          description: `Transition started on ${moment().format(
            'YYYY-MM-DD HH:mm:ss'
          )}`,
          entityId: id,
          completedById: user.id,
        });
      } else {
        await this.createEntityHistoryInBackground({
          type: 'Transition finish',
          description: `Transition finished on ${moment().format(
            'YYYY-MM-DD HH:mm:ss'
          )}`,
          entityId: id,
          completedById: user.id,
        });
      }
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }
}
