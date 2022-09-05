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
import { PrismaService } from 'nestjs-prisma';
import { User } from 'src/models/user.model';
import { RedisCacheService } from 'src/redisCache.service';
import { ChecklistTemplateService } from 'src/resolvers/checklist-template/checklist-template.service';
import { NotificationService } from 'src/services/notification.service';
import { UserService } from 'src/services/user.service';
import * as moment from 'moment';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EntityConnectionArgs } from './dto/args/entity-connection.args';
import { PaginatedEntity } from './dto/paginations/entity-connection.model';
import {
  connectionFromArraySlice,
  getPagingParameters,
} from 'src/common/pagination/connection-args';
import { PeriodicMaintenanceStatus } from 'src/common/enums/periodicMaintenanceStatus';
import { SparePRStatus } from 'src/common/enums/sparePRStatus';
import { BreakdownStatus } from 'src/common/enums/breakdownStatus';
import { EntityRepairConnectionArgs } from './dto/args/entity-repair-connection.args';
import { PaginatedEntityRepair } from './dto/paginations/entity-repair-connection.model';
import { EntityBreakdownConnectionArgs } from './dto/args/entity-breakdown-connection.args';
import { PaginatedEntityBreakdown } from './dto/paginations/entity-breakdown-connection.model';
import { EntitySparePRConnectionArgs } from './dto/args/entity-sparePR-connection.args';
import { PaginatedEntitySparePR } from './dto/paginations/entity-sparePR-connection.model';
import { EntityHistoryConnectionArgs } from './dto/args/entity-history-connection.args';
import { PaginatedEntityHistory } from './dto/paginations/entity-history-connection.model';
import { Entity, Prisma } from '@prisma/client';
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
    private readonly locationService: LocationService,
    private readonly authService: AuthService
  ) {}

  async findOne(id: number, includeLocation?: boolean) {
    const entity = await this.prisma.entity.findFirst({
      where: { id },
      include: { location: includeLocation ? true : false },
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
    zone: string,
    locationId: number,
    department: string,
    engine: string,
    measurement: string,
    currentRunning: number,
    lastService: number,
    brand: string,
    registeredDate: Date
  ) {
    try {
      const newDailyTemplate = await this.prisma.checklistTemplate.create({
        data: { type: 'Daily' },
        include: { items: true },
      });
      const newWeeklyTemplate = await this.prisma.checklistTemplate.create({
        data: { type: 'Weekly' },
        include: { items: true },
      });

      const entity = await this.prisma.entity.create({
        data: {
          createdById: user.id,
          typeId,
          machineNumber,
          model,
          zone,
          locationId,
          department,
          engine,
          measurement,
          currentRunning,
          lastService,
          brand,
          registeredDate,
          dailyChecklistTemplateId: newDailyTemplate.id,
          weeklyChecklistTemplateId: newWeeklyTemplate.id,
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
      await this.prisma.entity.update({
        where: { id },
        data: {
          isDeleted: true,
          deletedById: user.id,
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
    zone: string,
    locationId: number,
    department: string,
    engine: string,
    measurement: string,
    brand: string,
    registeredDate: Date
  ) {
    const entity = await this.prisma.entity.findFirst({
      where: { id },
      include: {
        location: locationId ? true : false,
        type: typeId ? true : false,
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
      if (machineNumber && entity.machineNumber != machineNumber) {
        await this.createEntityHistoryInBackground({
          type: 'Entity Edit',
          description: `Machine number changed from ${entity.machineNumber} to ${machineNumber}.`,
          entityId: id,
          completedById: user.id,
        });
      }
      if (model && entity.model != model) {
        await this.createEntityHistoryInBackground({
          type: 'Entity Edit',
          description: `Model changed from ${entity.model} to ${model}.`,
          entityId: id,
          completedById: user.id,
        });
      }
      if (typeId && entity.typeId != typeId) {
        const newType = await this.prisma.type.findFirst({
          where: { id: typeId },
        });
        await this.createEntityHistoryInBackground({
          type: 'Entity Edit',
          description: `Type changed from ${entity.type.name} to ${newType.name}.`,
          entityId: id,
          completedById: user.id,
        });
      }
      if (department && entity.department != department) {
        await this.createEntityHistoryInBackground({
          type: 'Entity Edit',
          description: `Department changed from ${entity.department} to ${department}.`,
          entityId: id,
          completedById: user.id,
        });
      }
      if (locationId && entity.locationId != locationId) {
        const newLocation = await this.prisma.location.findFirst({
          where: { id: locationId },
        });
        await this.createEntityHistoryInBackground({
          type: 'Entity Edit',
          description: `Location changed${
            entity.locationId ? ` from ${entity.location.name}` : ``
          } to ${newLocation.name}.`,
          entityId: id,
          completedById: user.id,
        });
      }
      if (engine && entity.engine != engine) {
        await this.createEntityHistoryInBackground({
          type: 'Entity Edit',
          description: `Engine changed from ${entity.engine} to ${engine}.`,
          entityId: id,
          completedById: user.id,
        });
      }
      if (measurement && entity.measurement != measurement) {
        await this.createEntityHistoryInBackground({
          type: 'Entity Edit',
          description: `Measurement changed from ${entity.measurement} to ${measurement}.`,
          entityId: id,
          completedById: user.id,
        });
      }
      if (brand && entity.brand != brand) {
        await this.createEntityHistoryInBackground({
          type: 'Entity Edit',
          description: `Brand changed from ${entity.brand} to ${brand}.`,
          entityId: id,
          completedById: user.id,
        });
      }
      if (
        registeredDate &&
        moment(entity.registeredDate).format('DD MMMM YYYY HH:mm:ss') !=
          moment(registeredDate).format('DD MMMM YYYY HH:mm:ss')
      ) {
        await this.createEntityHistoryInBackground({
          type: 'Entity Edit',
          description: `Registered date changed from ${moment(
            entity.registeredDate
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

      await this.prisma.entity.update({
        data: {
          typeId: typeId ?? undefined,
          machineNumber,
          model,
          zone,
          locationId: locationId ?? undefined,
          department,
          engine,
          measurement,
          brand,
          registeredDate,
        },
        where: { id },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Set entity status. */
  async setEntityStatus(user: User, entityId: number, status: string) {
    // Check if admin of entity or has permission
    await this.checkEntityAssignmentOrPermission(
      entityId,
      user.id,
      undefined,
      ['Admin', 'Engineer'],
      ['EDIT_ENTITY']
    );
    try {
      if (status === 'Working') {
        await this.prisma.entityBreakdown.updateMany({
          where: { entityId },
          data: { status: 'Done' },
        });
      }
      await this.prisma.entity.update({
        where: { id: entityId },
        data: { status, statusChangedAt: new Date() },
      });
      await this.createEntityHistoryInBackground({
        type: 'Entity Status Change',
        description: `(${entityId}) Set status to ${status}`,
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
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async getLatestReading(entity: any): Promise<number> {
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
      },
      select: { workingHour: true },
    });
    checklistsSince.forEach((c) => {
      reading += c.workingHour;
    });
    return reading;
  }

  // Get entity details
  async getSingleEntity(user: User, entityId: number) {
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
        location: true,
      },
    });
    await this.checkEntityAssignmentOrPermission(
      entityId,
      user.id,
      entity,
      [],
      ['VIEW_ALL_ENTITY']
    );
    if (!entity) throw new BadRequestException('Entity not found.');
    const reading = await this.getLatestReading(entity);
    entity.currentRunning = reading;
    return entity;
  }

  //** Get all entity. Results are paginated. User cursor argument to go forward/backward. */
  async getAllEntityWithPagination(
    user: User,
    args: EntityConnectionArgs
  ): Promise<PaginatedEntity> {
    const userPermissions = await this.userService.getUserRolesPermissionsList(
      user.id
    );
    const hasViewAll = userPermissions.includes('VIEW_ALL_ENTITY');
    const { limit, offset } = getPagingParameters(args);
    const limitPlusOne = limit + 1;
    const {
      createdById,
      search,
      assignedToId,
      entityType,
      status,
      locationIds,
      department,
      isAssigned,
      typeId,
      zone,
      brand,
      engine,
      measurement,
      lteCurrentRunning,
      gteCurrentRunning,
      lteLastService,
      gteLastService,
      isIncompleteChecklistTask,
    } = args;

    // eslint-disable-next-line prefer-const
    let where: any = { AND: [] };
    const todayStart = moment().startOf('day');
    const todayEnd = moment().endOf('day');

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
      where.AND.push({
        assignees: { some: { userId: !hasViewAll ? user.id : assignedToId } },
      });
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

    if (zone?.length > 0) {
      where.AND.push({
        zone: { in: zone },
      });
    }

    if (brand?.length > 0) {
      where.AND.push({
        brand: { in: brand },
      });
    }

    if (department?.length > 0) {
      where.AND.push({
        department: {
          in: department,
        },
      });
    }

    if (isAssigned) {
      where.AND.push({
        assignees: { some: {} },
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

    if (typeId?.length > 0) {
      where.AND.push({
        typeId: { in: typeId },
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

    if (gteCurrentRunning?.replace(/\D/g, '')) {
      where.AND.push({
        currentRunning: { gte: parseInt(gteCurrentRunning.replace(/\D/g, '')) },
      });
    }

    if (lteCurrentRunning?.replace(/\D/g, '')) {
      where.AND.push({
        currentRunning: { lte: parseInt(lteCurrentRunning.replace(/\D/g, '')) },
      });
    }

    if (
      gteCurrentRunning?.replace(/\D/g, '') &&
      lteCurrentRunning?.replace(/\D/g, '')
    ) {
      where.AND.push({
        currentRunning: {
          gte: parseInt(gteCurrentRunning.replace(/\D/g, '')),
          lte: parseInt(lteCurrentRunning.replace(/\D/g, '')),
        },
      });
    }

    if (gteLastService?.replace(/\D/g, '')) {
      where.AND.push({
        lastService: { gte: parseInt(gteLastService.replace(/\D/g, '')) },
      });
    }

    if (lteLastService?.replace(/\D/g, '')) {
      where.AND.push({
        lastService: { lte: parseInt(lteLastService.replace(/\D/g, '')) },
      });
    }

    if (
      gteLastService?.replace(/\D/g, '') &&
      lteLastService?.replace(/\D/g, '')
    ) {
      where.AND.push({
        lastService: {
          gte: parseInt(gteLastService.replace(/\D/g, '')),
          lte: parseInt(lteLastService.replace(/\D/g, '')),
        },
      });
    }

    if (isIncompleteChecklistTask) {
      where.AND.push({
        checklists: {
          some: {
            from: todayStart.toDate(),
            to: todayEnd.toDate(),
            items: {
              some: {
                completedAt: null,
              },
            },
          },
        },
      });
    }

    const entities = await this.prisma.entity.findMany({
      skip: offset,
      take: limitPlusOne,
      where,
      include: {
        createdBy: true,
        sparePRs: { orderBy: { id: 'desc' } },
        breakdowns: { orderBy: { id: 'desc' } },
        assignees: {
          include: {
            user: true,
          },
        },
        type: true,
        location: true,
      },
      orderBy: [{ id: 'asc' }],
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
  }

  //** Create entity periodic maintenance. */
  async createEntityPeriodicMaintenance(
    user: User,
    entityId: number,
    title: string,
    measurement: string,
    value: number,
    startDate: Date,
    tasks: string[]
  ) {
    await this.checkEntityAssignmentOrPermission(
      entityId,
      user.id,
      undefined,
      ['Admin', 'Engineer', 'User'],
      ['MODIFY_PERIODIC_MAINTENANCE']
    );
    try {
      const periodicMaintenance =
        await this.prisma.entityPeriodicMaintenance.create({
          data: {
            entityId,
            title,
            measurement,
            value,
            startDate,
          },
        });
      await this.prisma.entityPeriodicMaintenanceTask.createMany({
        data: tasks.map((task) => ({
          periodicMaintenanceId: periodicMaintenance.id,
          name: task,
        })),
      });
      await this.createEntityHistoryInBackground({
        type: 'Add Periodic Maintenance',
        description: `Added periodic maintenance (${periodicMaintenance.id})`,
        entityId: entityId,
        completedById: user.id,
      });
      const users = await this.getEntityAssignmentIds(
        periodicMaintenance.entityId,
        user.id
      );
      for (let index = 0; index < users.length; index++) {
        await this.notificationService.createInBackground({
          userId: users[index],
          body: `${user.fullName} (${user.rcno}) added new periodic maintenance on entity ${entityId}`,
          link: `/entity/${entityId}`,
        });
      }
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Edit entity periodic maintenance. */
  async editEntityPeriodicMaintenance(
    user: User,
    id: number,
    title: string,
    measurement: string,
    value: number,
    startDate: Date
  ) {
    const periodicMaintenance =
      await this.prisma.entityPeriodicMaintenance.findFirst({
        where: { id },
        select: {
          id: true,
          entityId: true,
          title: true,
          measurement: true,
          startDate: true,
          value: true,
        },
      });
    await this.checkEntityAssignmentOrPermission(
      periodicMaintenance.entityId,
      user.id,
      undefined,
      ['Admin', 'Engineer', 'User'],
      ['MODIFY_PERIODIC_MAINTENANCE']
    );
    try {
      if (periodicMaintenance.title != title) {
        await this.createEntityHistoryInBackground({
          type: 'Periodic Maintenance Edit',
          description: `(${id}) Title changed from ${periodicMaintenance.title} to ${title}.`,
          entityId: periodicMaintenance.entityId,
          completedById: user.id,
        });
      }
      if (periodicMaintenance.measurement != measurement) {
        await this.createEntityHistoryInBackground({
          type: 'Periodic Maintenance Edit',
          description: `(${id}) Measurement changed from ${periodicMaintenance.measurement} to ${measurement}.`,
          entityId: periodicMaintenance.entityId,
          completedById: user.id,
        });
      }
      if (periodicMaintenance.value != value) {
        await this.createEntityHistoryInBackground({
          type: 'Periodic Maintenance Edit',
          description: `(${id}) Value changed from ${periodicMaintenance.value} to ${value}.`,
          entityId: periodicMaintenance.entityId,
          completedById: user.id,
        });
      }
      if (
        moment(periodicMaintenance.startDate).format('DD MMMM YYYY HH:mm:ss') !=
        moment(startDate).format('DD MMMM YYYY HH:mm:ss')
      ) {
        await this.createEntityHistoryInBackground({
          type: 'Periodic Maintenance Edit',
          description: `(${id}) Start date changed from ${periodicMaintenance.startDate} to ${startDate}.`,
          entityId: periodicMaintenance.entityId,
          completedById: user.id,
        });
      }
      const users = await this.getEntityAssignmentIds(
        periodicMaintenance.entityId,
        user.id
      );
      for (let index = 0; index < users.length; index++) {
        await this.notificationService.createInBackground({
          userId: users[index],
          body: `${user.fullName} (${user.rcno}) edited periodic entity (${periodicMaintenance.id}) on entity ${periodicMaintenance.entityId}`,
          link: `/entity/${periodicMaintenance.entityId}`,
        });
      }
      await this.prisma.entityPeriodicMaintenance.update({
        where: { id },
        data: {
          title,
          measurement,
          value,
          startDate,
        },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Delete entity periodic maintenance. */
  async deleteEntityPeriodicMaintenance(user: User, id: number) {
    const periodicMaintenance =
      await this.prisma.entityPeriodicMaintenance.findFirst({
        where: { id },
        select: {
          id: true,
          entityId: true,
          title: true,
        },
      });
    await this.checkEntityAssignmentOrPermission(
      periodicMaintenance.entityId,
      user.id,
      undefined,
      ['Admin', 'Engineer', 'User'],
      ['MODIFY_PERIODIC_MAINTENANCE']
    );
    try {
      const users = await this.getEntityAssignmentIds(
        periodicMaintenance.entityId,
        user.id
      );
      for (let index = 0; index < users.length; index++) {
        await this.notificationService.createInBackground({
          userId: users[index],
          body: `${user.fullName} (${user.rcno}) deleted periodic maintenance (${periodicMaintenance.id}) on entity ${periodicMaintenance.entityId}`,
          link: `/entity/${periodicMaintenance.entityId}`,
        });
      }
      await this.createEntityHistoryInBackground({
        type: 'Periodic Maintenance Delete',
        description: `(${id}) Periodic Maintenance (${periodicMaintenance.title}) deleted.`,
        entityId: periodicMaintenance.entityId,
        completedById: user.id,
      });
      await this.prisma.entityPeriodicMaintenance.delete({
        where: { id },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Set entity periodic maintenance status. */
  async setEntityPeriodicMaintenanceStatus(
    user: User,
    id: number,
    status: PeriodicMaintenanceStatus
  ) {
    let completedFlag = false;
    const periodicMaintenance =
      await this.prisma.entityPeriodicMaintenance.findFirst({
        where: { id },
        select: {
          entityId: true,
        },
      });
    await this.checkEntityAssignmentOrPermission(
      periodicMaintenance.entityId,
      user.id,
      undefined,
      ['Admin', 'Engineer', 'User'],
      ['MODIFY_PERIODIC_MAINTENANCE']
    );
    try {
      if (status == 'Done') {
        completedFlag = true;
        await this.createEntityHistoryInBackground({
          type: 'Periodic Maintenance Status',
          description: `(${id}) Set status to ${status}.`,
          entityId: periodicMaintenance.entityId,
          completedById: user.id,
        });
      }
      if (status == 'Pending') {
        await this.createEntityHistoryInBackground({
          type: 'Periodic Maintenance Status',
          description: `(${id}) Set status to ${status}.`,
          entityId: periodicMaintenance.entityId,
          completedById: user.id,
        });
      }
      if (status == 'Missed') {
        await this.createEntityHistoryInBackground({
          type: 'Periodic Maintenance Status',
          description: `(${id}) Set status to ${status}.`,
          entityId: periodicMaintenance.entityId,
          completedById: user.id,
        });
      }
      const users = await this.getEntityAssignmentIds(
        periodicMaintenance.entityId,
        user.id
      );
      for (let index = 0; index < users.length; index++) {
        await this.notificationService.createInBackground({
          userId: users[index],
          body: `${user.fullName} (${user.rcno}) set periodic maintenance status to (${status}) on entity ${periodicMaintenance.entityId}`,
          link: `/entity/${periodicMaintenance.entityId}`,
        });
      }
      await this.prisma.entityPeriodicMaintenance.update({
        where: { id },
        data: completedFlag
          ? { completedById: user.id, completedAt: new Date(), status }
          : { completedById: null, completedAt: null, status },
      });
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

  //** Create entity spare PR. */
  async createEntitySparePR(
    user: User,
    entityId: number,
    requestedDate: Date,
    title: string,
    description: string
  ) {
    await this.checkEntityAssignmentOrPermission(
      entityId,
      user.id,
      undefined,
      ['Admin', 'Engineer', 'User'],
      ['MODIFY_SPARE_PR']
    );
    try {
      const sparePR = await this.prisma.entitySparePR.create({
        data: {
          entityId,
          requestedDate,
          title,
          description,
        },
      });
      await this.createEntityHistoryInBackground({
        type: 'Add Spare PR',
        description: `Added spare PR (${sparePR.id})`,
        entityId: entityId,
        completedById: user.id,
      });
      const users = await this.getEntityAssignmentIds(entityId, user.id);
      for (let index = 0; index < users.length; index++) {
        await this.notificationService.createInBackground({
          userId: users[index],
          body: `${user.fullName} (${user.rcno}) added new spare PR on entity ${entityId}`,
          link: `/entity/${sparePR.entityId}`,
        });
      }
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Edit entity spare pr. */
  async editEntitySparePR(
    user: User,
    id: number,
    requestedDate: Date,
    title: string,
    description: string
  ) {
    const sparePR = await this.prisma.entitySparePR.findFirst({
      where: { id },
      select: {
        id: true,
        entityId: true,
        title: true,
        description: true,
        requestedDate: true,
      },
    });
    await this.checkEntityAssignmentOrPermission(
      sparePR.entityId,
      user.id,
      undefined,
      ['Admin', 'Engineer', 'User'],
      ['MODIFY_SPARE_PR']
    );
    try {
      if (sparePR.title != title) {
        await this.createEntityHistoryInBackground({
          type: 'Spare PR Edit',
          description: `(${id}) Title changed from ${sparePR.title} to ${title}.`,
          entityId: sparePR.entityId,
          completedById: user.id,
        });
      }
      if (sparePR.description != description) {
        await this.createEntityHistoryInBackground({
          type: 'Spare PR Edit',
          description: `(${id}) Description changed from ${sparePR.description} to ${description}.`,
          entityId: sparePR.entityId,
          completedById: user.id,
        });
      }
      if (
        moment(sparePR.requestedDate).format('DD MMMM YYYY HH:mm:ss') !=
        moment(requestedDate).format('DD MMMM YYYY HH:mm:ss')
      ) {
        await this.createEntityHistoryInBackground({
          type: 'Spare PR Edit',
          description: `Requested date changed from ${moment(
            sparePR.requestedDate
          ).format('DD MMMM YYYY')} to ${moment(requestedDate).format(
            'DD MMMM YYYY'
          )}.`,
          entityId: sparePR.entityId,
          completedById: user.id,
        });
      }
      const users = await this.getEntityAssignmentIds(
        sparePR.entityId,
        user.id
      );
      for (let index = 0; index < users.length; index++) {
        await this.notificationService.createInBackground({
          userId: users[index],
          body: `${user.fullName} (${user.rcno}) edited spare PR (${sparePR.id}) on entity ${sparePR.entityId}`,
          link: `/entity/${sparePR.entityId}`,
        });
      }
      await this.prisma.entitySparePR.update({
        where: { id },
        data: { requestedDate, title, description },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Delete entity spare pr. */
  async deleteEntitySparePR(user: User, id: number) {
    const sparePR = await this.prisma.entitySparePR.findFirst({
      where: { id },
      select: {
        id: true,
        entityId: true,
        title: true,
      },
    });
    await this.checkEntityAssignmentOrPermission(
      sparePR.entityId,
      user.id,
      undefined,
      ['Admin', 'Engineer', 'User'],
      ['MODIFY_SPARE_PR']
    );
    try {
      await this.createEntityHistoryInBackground({
        type: 'Spare PR Delete',
        description: `(${id}) Spare PR (${sparePR.title}) deleted.`,
        entityId: sparePR.entityId,
        completedById: user.id,
      });
      const users = await this.getEntityAssignmentIds(
        sparePR.entityId,
        user.id
      );
      for (let index = 0; index < users.length; index++) {
        await this.notificationService.createInBackground({
          userId: users[index],
          body: `${user.fullName} (${user.rcno}) deleted spare PR (${sparePR.id}) on entity ${sparePR.entityId}`,
          link: `/entity/${sparePR.entityId}`,
        });
      }
      await this.prisma.entitySparePR.delete({
        where: { id },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Set entity spare pr status. */
  async setEntitySparePRStatus(user: User, id: number, status: SparePRStatus) {
    let completedFlag = false;
    const sparePR = await this.prisma.entitySparePR.findFirst({
      where: { id },
      select: {
        entityId: true,
      },
    });
    await this.checkEntityAssignmentOrPermission(
      sparePR.entityId,
      user.id,
      undefined,
      ['Admin', 'Engineer', 'User'],
      ['MODIFY_SPARE_PR']
    );
    try {
      if (status == 'Done') {
        completedFlag = true;
        await this.createEntityHistoryInBackground({
          type: 'Spare PR Status',
          description: `(${id}) Set status to ${status}.`,
          entityId: sparePR.entityId,
          completedById: user.id,
        });
      }
      if (status == 'Pending') {
        await this.createEntityHistoryInBackground({
          type: 'Spare PR Status',
          description: `(${id}) Set status to ${status}.`,
          entityId: sparePR.entityId,
          completedById: user.id,
        });
      }
      const users = await this.getEntityAssignmentIds(
        sparePR.entityId,
        user.id
      );
      for (let index = 0; index < users.length; index++) {
        await this.notificationService.createInBackground({
          userId: users[index],
          body: `${user.fullName} (${user.rcno}) set spare PR status to (${status}) on entity ${sparePR.entityId}`,
          link: `/entity/${sparePR.entityId}`,
        });
      }
      await this.prisma.entitySparePR.update({
        where: { id },
        data: completedFlag
          ? { completedById: user.id, completedAt: new Date(), status }
          : { completedById: null, completedAt: null, status },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Create entity breakdown. */
  async createEntityBreakdown(
    user: User,
    entityId: number,
    title: string,
    description: string
  ) {
    await this.checkEntityAssignmentOrPermission(
      entityId,
      user.id,
      undefined,
      ['Admin', 'Engineer'],
      ['MODIFY_BREAKDOWN']
    );
    try {
      const breakdown = await this.prisma.entityBreakdown.create({
        data: {
          entityId,
          title,
          description,
        },
      });
      await this.prisma.entity.update({
        where: { id: entityId },
        data: { status: 'Breakdown' },
      });
      await this.createEntityHistoryInBackground({
        type: 'Add Breakdown',
        description: `Added breakdown (${breakdown.id})`,
        entityId: entityId,
        completedById: user.id,
      });
      const users = await this.getEntityAssignmentIds(entityId, user.id);
      for (let index = 0; index < users.length; index++) {
        await this.notificationService.createInBackground({
          userId: users[index],
          body: `${user.fullName} (${user.rcno}) added new breakdown on entity ${entityId}`,
          link: `/entity/${entityId}`,
        });
      }
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Edit entity breakdown. */
  async editEntityBreakdown(
    user: User,
    id: number,
    title: string,
    description: string,
    estimatedDateOfRepair: Date
  ) {
    const breakdown = await this.prisma.entityBreakdown.findFirst({
      where: { id },
      select: {
        id: true,
        entityId: true,
        title: true,
        description: true,
        estimatedDateOfRepair: true,
      },
    });
    await this.checkEntityAssignmentOrPermission(
      breakdown.entityId,
      user.id,
      undefined,
      ['Admin', 'Engineer'],
      ['MODIFY_BREAKDOWN']
    );
    try {
      if (breakdown.title != title) {
        await this.createEntityHistoryInBackground({
          type: 'Breakdown Edit',
          description: `(${id}) Title changed from ${breakdown.title} to ${title}.`,
          entityId: breakdown.entityId,
          completedById: user.id,
        });
      }
      if (breakdown.description != description) {
        await this.createEntityHistoryInBackground({
          type: 'Breakdown Edit',
          description: `(${id}) Description changed from ${breakdown.description} to ${description}.`,
          entityId: breakdown.entityId,
          completedById: user.id,
        });
      }
      if (
        moment(breakdown.estimatedDateOfRepair).format(
          'DD MMMM YYYY HH:mm:ss'
        ) != moment(estimatedDateOfRepair).format('DD MMMM YYYY HH:mm:ss')
      ) {
        await this.createEntityHistoryInBackground({
          type: 'Breakdown Edit',
          description: `Estimated date of repair changed from ${moment(
            breakdown.estimatedDateOfRepair
          ).format('DD MMMM YYYY')} to ${moment(estimatedDateOfRepair).format(
            'DD MMMM YYYY'
          )}.`,
          entityId: id,
          completedById: user.id,
        });
      }
      const users = await this.getEntityAssignmentIds(
        breakdown.entityId,
        user.id
      );
      for (let index = 0; index < users.length; index++) {
        await this.notificationService.createInBackground({
          userId: users[index],
          body: `${user.fullName} (${user.rcno}) edited breakdown (${breakdown.id}) on entity ${breakdown.entityId}`,
          link: `/entity/${breakdown.entityId}`,
        });
      }
      await this.prisma.entityBreakdown.update({
        where: { id },
        data: { title, description, estimatedDateOfRepair },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Delete entity breakdown. */
  async deleteEntityBreakdown(user: User, id: number) {
    const breakdown = await this.prisma.entityBreakdown.findFirst({
      where: { id },
      select: {
        id: true,
        entityId: true,
        title: true,
      },
    });
    await this.checkEntityAssignmentOrPermission(
      breakdown.entityId,
      user.id,
      undefined,
      ['Admin', 'Engineer'],
      ['MODIFY_BREAKDOWN']
    );
    try {
      await this.createEntityHistoryInBackground({
        type: 'Breakdown Delete',
        description: `(${id}) Breakdown (${breakdown.title}) deleted.`,
        entityId: breakdown.entityId,
        completedById: user.id,
      });
      const users = await this.getEntityAssignmentIds(
        breakdown.entityId,
        user.id
      );
      for (let index = 0; index < users.length; index++) {
        await this.notificationService.createInBackground({
          userId: users[index],
          body: `${user.fullName} (${user.rcno}) deleted breakdown (${breakdown.id}) on entity ${breakdown.entityId}`,
          link: `/entity/${breakdown.entityId}`,
        });
      }
      await this.prisma.entityBreakdown.delete({
        where: { id },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Set entity breakdown status. */
  async setEntityBreakdownStatus(
    user: User,
    id: number,
    status: BreakdownStatus
  ) {
    let completedFlag = false;
    let entityStatus;
    const breakdown = await this.prisma.entityBreakdown.findFirst({
      where: { id },
      select: {
        entityId: true,
      },
    });
    await this.checkEntityAssignmentOrPermission(
      breakdown.entityId,
      user.id,
      undefined,
      ['Admin', 'Engineer'],
      ['MODIFY_BREAKDOWN']
    );
    try {
      if (status == 'Done') {
        completedFlag = true;
        entityStatus = 'Working';
        await this.createEntityHistoryInBackground({
          type: 'Repair Status',
          description: `(${id}) Set status to ${status}.`,
          entityId: breakdown.entityId,
          completedById: user.id,
        });
      }
      if (status == 'Pending') {
        entityStatus = 'Pending';
        await this.createEntityHistoryInBackground({
          type: 'Repair Status',
          description: `(${id}) Set status to ${status}.`,
          entityId: breakdown.entityId,
          completedById: user.id,
        });
      }
      if (status == 'Breakdown') {
        entityStatus = 'Breakdown';
        await this.createEntityHistoryInBackground({
          type: 'Repair Status',
          description: `(${id}) Set status to ${status}.`,
          entityId: breakdown.entityId,
          completedById: user.id,
        });
        const users = await this.getEntityAssignmentIds(
          breakdown.entityId,
          user.id
        );
        for (let index = 0; index < users.length; index++) {
          await this.notificationService.createInBackground({
            userId: users[index],
            body: `${user.fullName} (${user.rcno}) set breakdown status to (${status}) on entity ${breakdown.entityId}`,
            link: `/entity/${breakdown.entityId}`,
          });
        }
        //set entity status
        await this.prisma.entity.update({
          where: { id: breakdown.entityId },
          data: { status: entityStatus },
        });
      }

      await this.prisma.entityBreakdown.update({
        where: { id },
        data: completedFlag
          ? { completedById: user.id, completedAt: new Date(), status }
          : { completedById: null, completedAt: null, status },
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
  }

  //** Get entityBreakdown. Results are paginated. User cursor argument to go forward/backward. */
  async getEntityBreakdownWithPagination(
    user: User,
    args: EntityBreakdownConnectionArgs
  ): Promise<PaginatedEntityBreakdown> {
    const { limit, offset } = getPagingParameters(args);
    const limitPlusOne = limit + 1;
    const { entityId, search } = args;

    // eslint-disable-next-line prefer-const
    let where: any = { AND: [] };
    if (entityId) {
      where.AND.push({ entityId });
    }
    //for now these only
    if (search) {
      const or: any = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
      // If search contains all numbers, search the machine ids as well
      if (/^(0|[1-9]\d*)$/.test(search)) {
        or.push({ id: parseInt(search) });
      }
      where.AND.push({
        OR: or,
      });
    }
    const breakdown = await this.prisma.entityBreakdown.findMany({
      skip: offset,
      take: limitPlusOne,
      where,
      include: {
        completedBy: true,
      },
      orderBy: { id: 'desc' },
    });

    const count = await this.prisma.entityBreakdown.count({ where });
    const { edges, pageInfo } = connectionFromArraySlice(
      breakdown.slice(0, limit),
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

  //** Get entity spare PR. Results are paginated. User cursor argument to go forward/backward. */
  async getEntitySparePRWithPagination(
    user: User,
    args: EntitySparePRConnectionArgs
  ): Promise<PaginatedEntitySparePR> {
    const { limit, offset } = getPagingParameters(args);
    const limitPlusOne = limit + 1;
    const { entityId, search } = args;

    // eslint-disable-next-line prefer-const
    let where: any = { AND: [] };
    if (entityId) {
      where.AND.push({ entityId });
    }
    //for now these only
    if (search) {
      const or: any = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
      // If search contains all numbers, search the machine ids as well
      if (/^(0|[1-9]\d*)$/.test(search)) {
        or.push({ id: parseInt(search) });
      }
      where.AND.push({
        OR: or,
      });
    }
    const sparePR = await this.prisma.entitySparePR.findMany({
      skip: offset,
      take: limitPlusOne,
      where,
      include: {
        completedBy: true,
      },
      orderBy: { id: 'desc' },
    });

    const count = await this.prisma.entitySparePR.count({ where });
    const { edges, pageInfo } = connectionFromArraySlice(
      sparePR.slice(0, limit),
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

  //** Get entity history. Results are paginated. User cursor argument to go forward/backward. */
  async getEntityHistoryWithPagination(
    user: User,
    args: EntityHistoryConnectionArgs
  ): Promise<PaginatedEntityHistory> {
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
          in: location,
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
    if (newAssignments.length === 0) {
      throw new BadRequestException('No new users assigned.');
    }
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
        await this.createEntityHistoryInBackground({
          type: 'User Assign',
          description: `${user.fullName} (${
            user.rcno
          }) assigned ${newAssignmentsFormatted} to ${
            `${entity.type?.name} ` ?? ''
          }${entity.machineNumber} as ${type}.`,
          entityId: entityId,
          completedById: user.id,
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
        await this.createEntityHistoryInBackground({
          type: 'User Assign',
          description: `${newAssignment.fullName} (${newAssignment.rcno}) assigned as ${type}.`,
          entityId: entityId,
          completedById: user.id,
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

  //** Get entity periodic maintenance. Results are paginated. User cursor argument to go forward/backward. */
  async getEntityPeriodicMaintenanceWithPagination(
    user: User,
    args: EntityPeriodicMaintenanceConnectionArgs
  ): Promise<PaginatedEntityPeriodicMaintenance> {
    const { limit, offset } = getPagingParameters(args);
    const limitPlusOne = limit + 1;
    const { entityId, search } = args;

    // eslint-disable-next-line prefer-const
    let where: any = { AND: [] };
    if (entityId) {
      where.AND.push({ entityId });
    }

    //for now these only
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
    const periodicMaintenance =
      await this.prisma.entityPeriodicMaintenance.findMany({
        skip: offset,
        take: limitPlusOne,
        where,
        include: {
          completedBy: true,
          verifiedBy: true,
          entityPeriodicMaintenanceTask: {
            where: { parentTaskId: null },
            include: {
              subTasks: {
                include: {
                  subTasks: { include: { completedBy: true } },
                  completedBy: true,
                },
                orderBy: { id: 'asc' },
              },
              completedBy: true,
            },
            orderBy: { id: 'asc' },
          },
        },
        orderBy: { id: 'desc' },
      });

    const count = await this.prisma.entityPeriodicMaintenance.count({
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
  }

  //** Create Entity history */
  async createEntityHistory(entityHistory: EntityHistoryInterface) {
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
    let idleHour = 0;
    let breakdownHour = 0;

    //previously it was Idle. Idle status is no longer required so this function needs to change.
    if (entity.status === 'Critical') {
      const fromDate = await this.prisma.entityHistory.findFirst({
        where: {
          entityStatus: 'Working',
        },
        orderBy: {
          id: 'desc',
        },
      });
      const duration = moment.duration(now.diff(fromDate.createdAt));
      idleHour = duration.asHours();
    }
    if (entity.status === 'Breakdown') {
      const fromDate = await this.prisma.entityHistory.findFirst({
        where: {
          entityStatus: 'Working',
        },
        orderBy: {
          id: 'desc',
        },
      });
      const duration = moment.duration(now.diff(fromDate.createdAt));
      breakdownHour = duration.asHours();
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
  }

  //** Create entity history in background */
  async createEntityHistoryInBackground(entityHistory: EntityHistoryInterface) {
    await this.entityHistoryQueue.add('createEntityHistory', {
      entityHistory,
    });
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
  }

  //check periodic maintenance every hour. notify based on the notification hour
  //set status to Missed based on period
  @Cron(CronExpression.EVERY_HOUR)
  async updatePeriodicMaintenanceStatus() {
    const now = moment();
    const periodicMaintenance =
      await this.prisma.entityPeriodicMaintenance.findMany({
        include: {
          entity: {
            select: {
              currentRunning: true,
            },
          },
        },
      });

    for (let index = 0; index < periodicMaintenance.length; index++) {
      const value = periodicMaintenance[index].value;

      //const fixedDate = moment(periodicMaintenance[index].fixedDate);
      const notifDate = moment(periodicMaintenance[index].startDate);
      if (periodicMaintenance[index].measurement === 'hour') {
        notifDate.add(value, 'h');
      } else if (periodicMaintenance[index].measurement === 'day') {
        notifDate.add(value, 'd');
      } else if (periodicMaintenance[index].measurement === 'km') {
        if (value >= periodicMaintenance[index].entity.currentRunning) {
          const users = await this.prisma.entityAssignment.findMany({
            where: {
              entityId: periodicMaintenance[index].entityId,
              removedAt: null,
            },
          });
          for (let index = 0; index < users.length; index++) {
            await this.notificationService.createInBackground({
              userId: users[index].userId,
              body: `Periodic maintenance (${periodicMaintenance[index].id}) on entity ${periodicMaintenance[index].entityId} km reminder`,
              link: `/entity/${periodicMaintenance[index].entityId}`,
            });
          }
          await this.prisma.entityPeriodicMaintenance.update({
            where: {
              id: periodicMaintenance[index].id,
            },
            data: {
              startDate: moment(notifDate).toDate(),
            },
          });
        }
      }
      //notifDate.add(notifHour, 'h');

      if (notifDate.isSame(now)) {
        const users = await this.prisma.entityAssignment.findMany({
          where: {
            entityId: periodicMaintenance[index].entityId,
            removedAt: null,
          },
        });
        for (let index = 0; index < users.length; index++) {
          await this.notificationService.createInBackground({
            userId: users[index].userId,
            body: `Periodic maintenance (${periodicMaintenance[index].id}) on entity ${periodicMaintenance[index].entityId} reminder`,
            link: `/entity/${periodicMaintenance[index].entityId}`,
          });
        }
      }
    }
  }

  //** Get entity usage */
  async getEntityUsage(user: User, entityId: number, from: Date, to: Date) {
    try {
      const fromDate = moment(from).startOf('day');
      const toDate = moment(to).endOf('day');
      const key = `entityUsageHistoryByDate-${entityId}-${fromDate.format(
        'DD-MMMM-YYYY'
      )}-${toDate.format('DD-MMMM-YYYY')}`;
      let usageHistoryByDate = await this.redisCacheService.get(key);
      if (!usageHistoryByDate) {
        usageHistoryByDate = [];
        //get all usage of entity between date
        const usageHistoryArray = await this.prisma.entityHistory.findMany({
          where: {
            entityId,
            createdAt: { gte: fromDate.toDate(), lte: toDate.toDate() },
          },
          orderBy: {
            id: 'desc',
          },
        });
        const days = toDate.diff(fromDate, 'days') + 1;
        for (let i = 0; i < days; i++) {
          const day = fromDate.clone().add(i, 'day');
          const workingHour =
            usageHistoryArray.find((usage) =>
              moment(usage.createdAt).isSame(day, 'day')
            )?.workingHour ?? 0;
          const idleHour =
            usageHistoryArray.find((usage) =>
              moment(usage.createdAt).isSame(day, 'day')
            )?.idleHour ?? 0;
          const breakdownHour =
            usageHistoryArray.find((usage) =>
              moment(usage.createdAt).isSame(day, 'day')
            )?.breakdownHour ?? 0;
          usageHistoryByDate.push({
            date: day.toDate(),
            workingHour,
            idleHour,
            breakdownHour,
          });
        }
      }
      return usageHistoryByDate;
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //check entity every week. notify assigned users if breakdown exists
  @Cron(CronExpression.EVERY_WEEK)
  async checkEntityBreakdownExist() {
    const breakdown = await this.prisma.entityBreakdown.findMany();
    const now = moment().startOf('day');

    for (let index = 0; index < breakdown.length; index++) {
      if (breakdown[index].status === 'Breakdown') {
        const end = moment(breakdown[index].createdAt).endOf('day');

        if (moment.duration(end.diff(now)).asDays() >= 7) {
          const users = await this.prisma.entityAssignment.findMany({
            where: {
              entityId: breakdown[index].entityId,
              removedAt: null,
            },
          });

          for (let index = 0; index < users.length; index++) {
            await this.notificationService.createInBackground({
              userId: users[index].userId,
              body: `Reminder: Entity ${breakdown[index].entityId} has been broken for 1 week`,
              link: `/entity/${breakdown[index].entityId}`,
            });
          }
          await this.createEntityHistoryInBackground({
            type: 'Breakdown',
            description: `(${breakdown[index].id}) breakdown has been notified to all assigned users.`,
            entityId: breakdown[index].entityId,
          });
        }
      }
    }
  }

  //** Create entity periodic maintenance Sub task. */
  async createEntityPeriodicMaintenanceTask(
    user: User,
    periodicMaintenanceId: number,
    name: string,
    parentTaskId?: number
  ) {
    try {
      await this.prisma.entityPeriodicMaintenanceTask.create({
        data: {
          parentTaskId,
          periodicMaintenanceId,
          name,
        },
      });
      const entityPeriodicMaintenance =
        await this.prisma.entityPeriodicMaintenance.findFirst({
          where: {
            id: periodicMaintenanceId,
          },
          include: {
            entity: {
              select: {
                id: true,
              },
            },
          },
        });
      const entity = entityPeriodicMaintenance.entity;
      await this.createEntityHistoryInBackground({
        type: 'Add Sub task',
        description: `Added sub task to periodic maintenance (${periodicMaintenanceId})`,
        entityId: entity.id,
        completedById: user.id,
      });
      const users = await this.getEntityAssignmentIds(entity.id, user.id);
      for (let index = 0; index < users.length; index++) {
        await this.notificationService.createInBackground({
          userId: users[index],
          body: `${user.fullName} (${user.rcno}) added new sub task in entity (${entity.id})'s periodic maintenance (${periodicMaintenanceId}) `,
          link: `/entity/${entity.id}`,
        });
      }
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Set task as complete or incomplete. */
  async toggleEntityPMTask(user: User, id: number, complete: boolean) {
    const completion = complete
      ? { completedById: user.id, completedAt: new Date() }
      : { completedById: null, completedAt: null };
    const transactions: any = [
      this.prisma.entityPeriodicMaintenanceTask.update({
        where: { id },
        data: completion,
      }),
    ];
    const subTasks = await this.prisma.entityPeriodicMaintenanceTask.findMany({
      where: { parentTaskId: id },
      select: { id: true },
    });
    const subTaskIds = subTasks.map((st) => st.id);
    if (subTaskIds.length > 0) {
      transactions.push(
        this.prisma.entityPeriodicMaintenanceTask.updateMany({
          where: {
            OR: [
              { id: { in: subTaskIds } },
              { parentTaskId: { in: subTaskIds } },
            ],
          },
          data: completion,
        })
      );
    }
    try {
      await this.prisma.$transaction(transactions);
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Delete task. */
  async deleteEntityPMTask(user: User, id: number) {
    try {
      await this.prisma.entityPeriodicMaintenanceTask.delete({
        where: { id },
      });
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
    const { limit, offset } = getPagingParameters(args);
    const limitPlusOne = limit + 1;
    const { createdById, search, assignedToId, status, locationIds } = args;

    // eslint-disable-next-line prefer-const
    let where: any = { AND: [] };
    if (createdById) {
      where.AND.push({ createdById });
    }

    if (assignedToId) {
      where.AND.push({
        assignees: { some: { userId: assignedToId } },
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
        location: true,
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
  }

  //** Get all entity usage*/
  async getAllEntityUsage(user: User, from: Date, to: Date) {
    try {
      const fromDate = moment(from).startOf('day');
      const toDate = moment(to).endOf('day');
      const key = `allEntityUsageHistoryByDate-${fromDate.format(
        'DD-MMMM-YYYY'
      )}-${toDate.format('DD-MMMM-YYYY')}`;
      let usageHistoryByDate = await this.redisCacheService.get(key);
      if (!usageHistoryByDate) {
        usageHistoryByDate = [];
        //get all usage of entity between date
        const entityUsageHistoryArray =
          await this.prisma.entityHistory.findMany({
            where: {
              createdAt: { gte: fromDate.toDate(), lte: toDate.toDate() },
            },
            orderBy: {
              id: 'desc',
            },
          });
        const days = toDate.diff(fromDate, 'days') + 1;
        for (let i = 0; i < days; i++) {
          const day = fromDate.clone().add(i, 'day');
          const workingHour =
            entityUsageHistoryArray.find((usage) =>
              moment(usage.createdAt).isSame(day, 'day')
            )?.workingHour ?? 0;
          const idleHour =
            entityUsageHistoryArray.find((usage) =>
              moment(usage.createdAt).isSame(day, 'day')
            )?.idleHour ?? 0;
          const breakdownHour =
            entityUsageHistoryArray.find((usage) =>
              moment(usage.createdAt).isSame(day, 'day')
            )?.breakdownHour ?? 0;
          const totalHour = workingHour + idleHour + breakdownHour;
          const workingPercentage = (workingHour / totalHour) * 100;
          const idlePercentage = (idleHour / totalHour) * 100;
          const breakdownPercentage = (breakdownHour / totalHour) * 100;
          usageHistoryByDate.push({
            date: day.toDate(),
            workingHour,
            idleHour,
            breakdownHour,
            totalHour,
            workingPercentage: workingPercentage ? workingPercentage : 0,
            idlePercentage: idlePercentage ? idlePercentage : 0,
            breakdownPercentage: breakdownPercentage ? breakdownPercentage : 0,
          });
        }
      }
      return usageHistoryByDate;
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Set periodic maintenance as verified or unverified. */
  async toggleVerifyEntityPeriodicMaintenance(
    user: User,
    id: number,
    verify: boolean
  ) {
    try {
      const checklist = await this.prisma.entityPeriodicMaintenance.findFirst({
        where: {
          id,
        },
        select: {
          entityId: true,
        },
      });
      await this.prisma.entityPeriodicMaintenance.update({
        where: { id },
        data: verify
          ? { verifiedById: user.id, verifiedAt: new Date() }
          : { verifiedById: null, verifiedAt: null },
      });

      const users = await this.getEntityAssignmentIds(
        checklist.entityId,
        user.id
      );
      for (let index = 0; index < users.length; index++) {
        await this.notificationService.createInBackground({
          userId: users[index],
          body: `${user.fullName} (${user.rcno}) ${
            verify ? 'verified' : 'unverified'
          } periodic maintenance (${id}) on entity ${checklist.entityId}`,
          link: `/entity/${checklist.entityId}`,
        });
      }
      await this.createEntityHistoryInBackground({
        type: 'Periodic maintenance verify',
        description: verify
          ? `Periodic maintenance (${id}) has been verified to be completed.`
          : `Periodic maintenance (${id}) has been unverified.`,
        entityId: checklist.entityId,
      });
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
    const { limit, offset } = getPagingParameters(args);
    const limitPlusOne = limit + 1;
    const { search, status, location } = args;

    // eslint-disable-next-line prefer-const
    let where: any = { AND: [] };

    if (status) {
      where.AND.push({ status });
    }

    if (location.length > 0) {
      where.AND.push({
        entity: {
          location: {
            in: location,
          },
        },
      });
    }

    if (search) {
      const or: any = [{ title: { contains: search, mode: 'insensitive' } }];
      // If search contains all numbers, search the machine ids as well
      if (/^(0|[1-9]\d*)$/.test(search)) {
        or.push({ id: parseInt(search) });
      }
      where.AND.push({
        OR: or,
      });
    }
    const periodicMaintenance =
      await this.prisma.entityPeriodicMaintenance.findMany({
        skip: offset,
        take: limitPlusOne,
        where,
        include: {
          entity: {
            include: {
              type: true,
            },
          },
        },
        orderBy: { id: 'desc' },
      });

    const count = await this.prisma.entityPeriodicMaintenance.count({
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
  }

  //** Get all entity periodic maintenance tasks. Results are paginated. User cursor argument to go forward/backward. */
  async getAllEntityPeriodicMaintenanceTasksWithPagination(
    user: User,
    args: EntityPeriodicMaintenanceConnectionArgs
  ): Promise<PaginatedEntityPeriodicMaintenanceTask> {
    const { limit, offset } = getPagingParameters(args);
    const limitPlusOne = limit + 1;
    const { search, complete, location, status, assignedToId } = args;

    // eslint-disable-next-line prefer-const
    let where: any = { AND: [] };

    if (assignedToId) {
      where.AND.push({
        periodicMaintenance: {
          entity: {
            assignees: { some: { userId: assignedToId } },
          },
        },
      });
    }

    if (location?.length > 0) {
      where.AND.push({
        periodicMaintenance: {
          entity: {
            location: {
              in: location,
            },
          },
        },
      });
    }

    if (status) {
      where.AND.push({
        periodicMaintenance: {
          status: status,
        },
      });
    }

    if (complete) {
      where.AND.push({
        NOT: [{ completedAt: null }],
      });
    }

    if (search) {
      const or: any = [{ name: { contains: search, mode: 'insensitive' } }];
      // If search contains all numbers, search the entity ids as well
      if (/^(0|[1-9]\d*)$/.test(search)) {
        or.push({ id: parseInt(search) });
      }
      where.AND.push({
        OR: or,
      });
    }
    const periodicMaintenanceTask =
      await this.prisma.entityPeriodicMaintenanceTask.findMany({
        skip: offset,
        take: limitPlusOne,
        where,
        include: {
          periodicMaintenance: {
            include: {
              entity: {
                include: {
                  assignees: {
                    include: {
                      user: true,
                    },
                  },
                  type: true,
                },
              },
            },
          },
        },
        orderBy: { id: 'desc' },
      });

    const count = await this.prisma.entityPeriodicMaintenanceTask.count({
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

  //** Get all entity pm task status count*/
  async getAllEntityPMTaskStatusCount(user: User, assignedToId?: number) {
    try {
      const key = `allEntityPMTaskStatusCount`;
      let pmTaskStatusCount = await this.redisCacheService.get(key);
      let pending;
      let done;
      if (!pmTaskStatusCount) {
        pmTaskStatusCount = '';

        if (assignedToId) {
          pending = await this.prisma.entityPeriodicMaintenanceTask.findMany({
            where: {
              completedAt: null,
              periodicMaintenance: {
                entity: {
                  assignees: { some: { userId: assignedToId } },
                },
              },
            },
          });
        } else {
          pending = await this.prisma.entityPeriodicMaintenanceTask.findMany({
            where: {
              completedAt: null,
            },
          });
        }

        if (assignedToId) {
          done = await this.prisma.entityPeriodicMaintenanceTask.findMany({
            where: {
              NOT: [{ completedAt: null }],
              periodicMaintenance: {
                entity: {
                  assignees: { some: { userId: assignedToId } },
                },
              },
            },
          });
        } else {
          done = await this.prisma.entityPeriodicMaintenanceTask.findMany({
            where: {
              NOT: [{ completedAt: null }],
            },
          });
        }

        pmTaskStatusCount = {
          pending: pending.length ?? 0,
          done: done.length ?? 0,
        };
      }
      return pmTaskStatusCount;
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async getAllEntityPMStatusCount() {
    try {
      const key = `allEntityPMStatusCount`;
      let pmStatusCount = await this.redisCacheService.get(key);
      if (!pmStatusCount) {
        pmStatusCount = '';
        const missed = await this.prisma.entityPeriodicMaintenance.findMany({
          where: {
            status: 'Missed',
          },
        });
        const pending = await this.prisma.entityPeriodicMaintenance.findMany({
          where: {
            status: 'Pending',
          },
        });
        const done = await this.prisma.entityPeriodicMaintenance.findMany({
          where: {
            status: 'Done',
          },
        });

        pmStatusCount = {
          missed: missed.length ?? 0,
          pending: pending.length ?? 0,
          done: done.length ?? 0,
        };
      }
      return pmStatusCount;
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async entityTransfer({
    entityId,
    users,
    newLocationId,
  }: EntityTransferInput) {
    const entity = await this.findOne(entityId, true);
    const newLocation = await this.locationService.findOne(newLocationId);
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
      });
    }
    if (users) {
      for (const assignment of removedAssignments) {
        await this.createEntityHistoryInBackground({
          type: 'User Unassigned',
          description: `${assignment.user.fullName} (${assignment.user.rcno}) removed as ${assignment.type}.`,
          entityId: entityId,
        });
      }
      for (const assignment of newAssignments) {
        await this.createEntityHistoryInBackground({
          type: 'User Assign',
          description: `${assignment.user.fullName} (${assignment.user.rcno}) assigned as ${assignment.type}.`,
          entityId: entityId,
        });
      }
    }
  }

  //** Get all entity status count*/
  async getAllEntityStatusCount(
    user: User,
    isAssigned?: boolean,
    entityType?: string
  ) {
    try {
      const key = `allEntityStatusCount`;
      let statusCount = await this.redisCacheService.get(key);

      if (!statusCount) {
        statusCount = '';

        const working = isAssigned
          ? await this.prisma.entity.findMany({
              where: {
                status: 'Working',
                assignees: { some: {} },
                type: {
                  entityType: {
                    in: entityType,
                  },
                },
              },
            })
          : await this.prisma.entity.findMany({
              where: {
                status: 'Working',
                type: {
                  entityType: {
                    in: entityType,
                  },
                },
              },
            });

        const critical = isAssigned
          ? await this.prisma.entity.findMany({
              where: {
                status: 'Critical',
                assignees: { some: {} },
                type: {
                  entityType: {
                    in: entityType,
                  },
                },
              },
            })
          : await this.prisma.entity.findMany({
              where: {
                status: 'Critical',
                type: {
                  entityType: {
                    in: entityType,
                  },
                },
              },
            });

        const breakdown = isAssigned
          ? await this.prisma.entity.findMany({
              where: {
                status: 'Breakdown',
                assignees: { some: {} },
                type: {
                  entityType: {
                    in: entityType,
                  },
                },
              },
            })
          : await this.prisma.entity.findMany({
              where: {
                status: 'Breakdown',
                type: {
                  entityType: {
                    in: entityType,
                  },
                },
              },
            });

        const dispose = isAssigned
          ? await this.prisma.entity.findMany({
              where: {
                status: 'Dispose',
                assignees: { some: {} },
                type: {
                  entityType: {
                    in: entityType,
                  },
                },
              },
            })
          : await this.prisma.entity.findMany({
              where: {
                status: 'Dispose',
                type: {
                  entityType: {
                    in: entityType,
                  },
                },
              },
            });

        statusCount = {
          working: working.length ?? 0,
          critical: critical.length ?? 0,
          breakdown: breakdown.length ?? 0,
          dispose: dispose.length ?? 0,
        };
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
    assignments?: ('User' | 'Engineer' | 'Admin')[],
    permissions?: string[]
  ) {
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
        }
      }
    }
    if (!hasAssignment && !hasPermission) {
      throw new ForbiddenException('You do not have access to this resource.');
    }
  }

  // Throw an error if user does not have assignment to any entity.
  async checkAllEntityAssignments(
    userId: number,
    assignments: ('User' | 'Engineer' | 'Admin')[]
  ) {
    const userAssignments = await this.prisma.entityAssignment.count({
      where: { userId, type: { in: assignments }, removedAt: null },
    });
    if (userAssignments === 0) {
      throw new ForbiddenException('You do not have access to this resource');
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
            type: {
              entityType: 'Machine',
            },
          },
        });
        const vehicle = await this.prisma.entity.findMany({
          where: {
            status: 'Breakdown',
            type: {
              entityType: 'Vehicle',
            },
          },
        });
        const vessel = await this.prisma.entity.findMany({
          where: {
            status: 'Breakdown',
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
      const key = `allEntityChecklistAndPMSummary`;
      let checklistAndPMSummary = await this.redisCacheService.get(key);
      const todayStart = moment().startOf('day');
      const todayEnd = moment().endOf('day');

      if (!checklistAndPMSummary) {
        checklistAndPMSummary = '';

        const pm = await this.prisma.periodicMaintenance.findMany({
          where: {
            from: todayStart.toDate(),
            to: todayEnd.toDate(),
            entity: {
              assignees: { some: { userId: user.id } },
            },
            tasks: {
              some: {
                completedAt: null,
                subTasks: {
                  some: {
                    completedAt: null,
                    subTasks: {
                      some: { completedAt: null },
                    },
                  },
                },
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

        const checklist = await this.prisma.checklist.findMany({
          where: {
            from: todayStart.toDate(),
            to: todayEnd.toDate(),
            entity: {
              assignees: { some: { userId: user.id } },
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

        let machineTaskComplete = false;
        let vehicleTaskComplete = false;
        let vesselTaskComplete = false;
        let machineChecklistComplete = false;
        let vehicleChecklistComplete = false;
        let vesselChecklistComplete = false;
        for (const p of pm) {
          if (p.entity.type.entityType === 'Machine') {
            machineTaskComplete = true;
          } else if (p.entity.type.entityType === 'Vehicle') {
            vehicleTaskComplete = true;
          } else if (p.entity.type.entityType === 'Vessel') {
            vesselTaskComplete = true;
          } else if (
            machineTaskComplete &&
            vehicleTaskComplete &&
            vesselTaskComplete
          ) {
            break;
          }
        }
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

        const pmUnique = [...new Set(pm.map((m) => m.entityId))];
        const pmChecklistUnique = [
          ...new Set(checklist.map((m) => m.entityId)),
        ];

        checklistAndPMSummary = {
          pm: pmUnique,
          checklist: pmChecklistUnique,
          machineTaskComplete,
          vehicleTaskComplete,
          vesselTaskComplete,
          machineChecklistComplete,
          vehicleChecklistComplete,
          vesselChecklistComplete,
        };
      }
      return checklistAndPMSummary;
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }
}
