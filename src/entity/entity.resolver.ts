/* eslint-disable @typescript-eslint/ban-types */
import { Resolver, Query, Args, Mutation, Int } from '@nestjs/graphql';
import { EntityService } from './entity.service';
import { InternalServerErrorException, UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from 'src/guards/gql-auth.guard';
import { PrismaService } from 'nestjs-prisma';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { Permissions } from 'src/decorators/permissions.decorator';
import { UserEntity } from 'src/decorators/user.decorator';
import { User } from 'src/models/user.model';
import { PaginatedEntity } from './dto/paginations/entity-connection.model';
import { EntityConnectionArgs } from './dto/args/entity-connection.args';
import { PeriodicMaintenanceStatus } from 'src/common/enums/periodicMaintenanceStatus';
import { SparePRStatus } from 'src/common/enums/sparePRStatus';
import { PaginatedEntityPeriodicMaintenance } from './dto/paginations/entity-periodic-maintenance-connection.model';
import { EntityPeriodicMaintenanceConnectionArgs } from './dto/args/entity-periodic-maintenance-connection.args';
import { PaginatedEntitySparePR } from './dto/paginations/entity-sparePR-connection.model';
import { EntityRepairConnectionArgs } from './dto/args/entity-repair-connection.args';
import { PaginatedEntityRepair } from './dto/paginations/entity-repair-connection.model';
import { EntityHistoryConnectionArgs } from './dto/args/entity-history-connection.args';
import { PaginatedEntityHistory } from './dto/paginations/entity-history-connection.model';
import { BreakdownNotif } from 'src/models/breakdownNotif.model';
import { EntityUsageHistory } from './dto/models/entity-usage-history.model';
import { AllEntityUsageHistory } from './dto/models/all-entity-usage-history.model';
import { PaginatedEntityPeriodicMaintenanceTask } from './dto/paginations/entity-pm-tasks-connection.model';
import { PMTaskStatusCount } from 'src/models/PMTaskStatusCount.model';
import { maintenanceStatusCount } from 'src/models/maintenanceStatusCount.model';
import { entityStatusCount } from './dto/models/entityStatusCount.model';
import { Entity } from './dto/models/entity.model';
import { entityBreakdownCount } from './dto/models/entityBreakdownCount.model';
import { entityChecklistAndPMSummary } from './dto/models/entityChecklistAndPMSummary.model';
import { entityPMSummary } from './dto/models/entityPMSummary.model';
import { AllGroupedEntityUsage } from './dto/models/all-grouped-entity-usage.model';

@UseGuards(GqlAuthGuard, PermissionsGuard)
@Resolver(() => Entity)
export class EntityResolver {
  constructor(
    private readonly entityService: EntityService,
    private prisma: PrismaService
  ) {}

  @Query(() => [Entity], { name: 'searchEntity' })
  search(
    @Args('query', { nullable: true }) query: string,
    @Args('entityIds', { nullable: true, type: () => [Int] })
    entityIds: number[],
    @Args('limit', { nullable: true }) limit: number,
    @Args('entityType', { nullable: true }) entityType: string
  ) {
    return this.entityService.search(query, entityIds, limit, entityType);
  }

  @Permissions('ADD_ENTITY')
  @Mutation(() => String)
  async createEntity(
    @UserEntity() user: User,
    @Args('typeId', { nullable: true }) typeId: number,
    @Args('machineNumber', { nullable: true }) machineNumber: string,
    @Args('model', { nullable: true }) model: string,
    @Args('locationId', { nullable: true }) locationId: number,
    @Args('divisionId', { nullable: true }) divisionId: number,
    @Args('engine', { nullable: true }) engine: string,
    @Args('measurement', { nullable: true }) measurement: string,
    @Args('currentRunning', { nullable: true }) currentRunning: number,
    @Args('lastService', { nullable: true }) lastService: number,
    @Args('brand', { nullable: true }) brand: string,
    @Args('registeredDate', { nullable: true }) registeredDate: Date,
    @Args('parentEntityId', { nullable: true }) parentEntityId: number,
    @Args('hullTypeId', { nullable: true }) hullTypeId: number,
    @Args('dimension', { nullable: true }) dimension: number,
    @Args('registryNumber', { nullable: true }) registryNumber: string
  ): Promise<String> {
    await this.entityService.createEntity(
      user,
      typeId,
      machineNumber,
      model,
      locationId,
      divisionId,
      engine,
      measurement,
      currentRunning,
      lastService,
      brand,
      registeredDate,
      parentEntityId,
      hullTypeId,
      dimension,
      registryNumber
    );
    return `Successfully created entity.`;
  }

  @Permissions('DELETE_ENTITY')
  @Mutation(() => String)
  async removeEntity(
    @UserEntity() user: User,
    @Args('id') id: number
  ): Promise<String> {
    try {
      await this.entityService.deleteEntity(id, user);
      return `Entity removed.`;
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  // Permission checked in service
  @Mutation(() => String)
  async editEntity(
    @UserEntity() user: User,
    @Args('id') id: number,
    @Args('typeId', { nullable: true }) typeId: number,
    @Args('machineNumber', { nullable: true }) machineNumber: string,
    @Args('model', { nullable: true }) model: string,
    @Args('locationId', { nullable: true }) locationId: number,
    @Args('divisionId', { nullable: true }) divisionId: number,
    @Args('engine', { nullable: true }) engine: string,
    @Args('measurement', { nullable: true }) measurement: string,
    @Args('brand', { nullable: true }) brand: string,
    @Args('registeredDate', { nullable: true }) registeredDate: Date,
    @Args('hullTypeId', { nullable: true }) hullTypeId: number,
    @Args('dimension', { nullable: true }) dimension: number,
    @Args('registryNumber', { nullable: true }) registryNumber: string
  ): Promise<String> {
    await this.entityService.editEntity(
      user,
      id,
      typeId,
      machineNumber,
      model,
      locationId,
      divisionId,
      engine,
      measurement,
      brand,
      registeredDate,
      hullTypeId,
      dimension,
      registryNumber
    );
    return `Entity updated.`;
  }

  // Permission checked in service
  @Mutation(() => String)
  async setEntityStatus(
    @UserEntity() user: User,
    @Args('entityId') entityId: number,
    @Args('status', { type: () => String })
    status: string
  ): Promise<String> {
    await this.entityService.setEntityStatus(entityId, status, user);
    return `Entity status set to ${status}.`;
  }

  // Permission checked in service
  @Query(() => Entity)
  async getSingleEntity(
    @UserEntity() user: User,
    @Args('entityId') entityId: number
  ) {
    return await this.entityService.getSingleEntity(user, entityId);
  }

  // Permission checked in service
  // Returns all entities if user has VIEW_ALL_ENTITY permission. Otherwise only
  // returns assigned entities
  @Query(() => PaginatedEntity)
  async getAllEntity(
    @UserEntity() user: User,
    @Args() args: EntityConnectionArgs
  ): Promise<PaginatedEntity> {
    return await this.entityService.getAllEntityWithPagination(user, args);
  }

  // Permission checked in service
  @Mutation(() => String)
  async addEntityPeriodicMaintenance(
    @UserEntity() user: User,
    @Args('entityId') entityId: number,
    @Args('title') title: string,
    @Args('measurement') measurement: string,
    @Args('value') value: number,
    @Args('startDate') startDate: Date,
    @Args('tasks', { nullable: true, type: () => [String] })
    tasks: string[]
  ): Promise<String> {
    await this.entityService.createEntityPeriodicMaintenance(
      user,
      entityId,
      title,
      measurement,
      value,
      startDate,
      tasks
    );
    return `Added periodic maintenance.`;
  }

  // Permission checked in service
  @Mutation(() => String)
  async editEntityPeriodicMaintenance(
    @UserEntity() user: User,
    @Args('id') id: number,
    @Args('title') title: string,
    @Args('measurement') measurement: string,
    @Args('value') value: number,
    @Args('startDate') startDate: Date
  ): Promise<String> {
    await this.entityService.editEntityPeriodicMaintenance(
      user,
      id,
      title,
      measurement,
      value,
      startDate
    );
    return `Periodic maintenance updated.`;
  }

  // Permission checked in service
  @Mutation(() => String)
  async deleteEntityPeriodicMaintenance(
    @UserEntity() user: User,
    @Args('id') id: number
  ): Promise<String> {
    await this.entityService.deleteEntityPeriodicMaintenance(user, id);
    return `Periodic maintenance deleted.`;
  }

  // Permission checked in service
  @Mutation(() => String)
  async setEntityPeriodicMaintenanceStatus(
    @UserEntity() user: User,
    @Args('id') id: number,
    @Args('status', { type: () => PeriodicMaintenanceStatus })
    status: PeriodicMaintenanceStatus
  ): Promise<String> {
    await this.entityService.setEntityPeriodicMaintenanceStatus(
      user,
      id,
      status
    );
    return `Periodic maintenance status updated.`;
  }

  // Permission checked in service
  @Mutation(() => String)
  async addEntityRepairRequest(
    @UserEntity() user: User,
    @Args('entityId') entityId: number,
    @Args('internal', { nullable: true }) internal: boolean,
    @Args('projectName', { nullable: true }) projectName: string,
    @Args('location', { nullable: true }) location: string,
    @Args('reason', { nullable: true }) reason: string,
    @Args('additionalInfo', { nullable: true }) additionalInfo: string,
    @Args('attendInfo', { nullable: true }) attendInfo: string,
    @Args('operatorId', { nullable: true }) operatorId: number,
    @Args('supervisorId', { nullable: true }) supervisorId: number,
    @Args('projectManagerId', { nullable: true }) projectManagerId: number
  ): Promise<String> {
    await this.entityService.createEntityRepairRequest(
      user,
      entityId,
      internal,
      projectName,
      location,
      reason,
      additionalInfo,
      attendInfo,
      operatorId,
      supervisorId,
      projectManagerId
    );
    return `Added repair request to entity.`;
  }

  // Permission checked in service
  @Mutation(() => String)
  async editEntityRepairRequest(
    @UserEntity() user: User,
    @Args('id') id: number,
    @Args('internal', { nullable: true }) internal: boolean,
    @Args('projectName', { nullable: true }) projectName: string,
    @Args('location', { nullable: true }) location: string,
    @Args('reason', { nullable: true }) reason: string,
    @Args('additionalInfo', { nullable: true }) additionalInfo: string,
    @Args('attendInfo', { nullable: true }) attendInfo: string,
    @Args('operatorId', { nullable: true }) operatorId: number,
    @Args('supervisorId', { nullable: true }) supervisorId: number,
    @Args('projectManagerId', { nullable: true }) projectManagerId: number
  ): Promise<String> {
    await this.entityService.editEntityRepairRequest(
      user,
      id,
      internal,
      projectName,
      location,
      reason,
      additionalInfo,
      attendInfo,
      operatorId,
      supervisorId,
      projectManagerId
    );
    return `Repair request updated.`;
  }

  // Permission checked in service
  @Mutation(() => String)
  async deleteEntityRepairRequest(
    @UserEntity() user: User,
    @Args('id') id: number
  ): Promise<String> {
    await this.entityService.deleteEntityRepairRequest(user, id);
    return `Repair request deleted.`;
  }

  @Query(() => PaginatedEntityPeriodicMaintenance)
  async getAllPeriodicMaintenanceOfEntity(
    @UserEntity() user: User,
    @Args() args: EntityPeriodicMaintenanceConnectionArgs
  ): Promise<PaginatedEntityPeriodicMaintenance> {
    return await this.entityService.getEntityPeriodicMaintenanceWithPagination(
      user,
      args
    );
  }

  @Query(() => PaginatedEntityRepair)
  async getAllRepairRequestOfEntity(
    @UserEntity() user: User,
    @Args() args: EntityRepairConnectionArgs
  ): Promise<PaginatedEntityRepair> {
    return await this.entityService.getEntityRepairRequestWithPagination(
      user,
      args
    );
  }

  @Query(() => PaginatedEntityHistory)
  async getAllHistoryOfEntity(
    @UserEntity() user: User,
    @Args() args: EntityHistoryConnectionArgs
  ): Promise<PaginatedEntityHistory> {
    return await this.entityService.getEntityHistoryWithPagination(user, args);
  }

  // Permission checked in service
  @Mutation(() => String)
  async assignUserToEntity(
    @UserEntity() user: User,
    @Args('entityId') entityId: number,
    @Args('type') type: string,
    @Args('userIds', { type: () => [Int] }) userIds: number[]
  ): Promise<String> {
    await this.entityService.assignUserToEntity(user, entityId, type, userIds);
    return `Successfully assigned user${
      userIds.length > 1 ? 's' : ''
    } to entity.`;
  }

  // Permission checked in service
  @Mutation(() => String)
  async unassignUserFromEntity(
    @UserEntity() user: User,
    @Args('entityId') entityId: number,
    @Args('type') type: string,
    @Args('userId') userId: number
  ): Promise<string> {
    await this.entityService.unassignUserFromEntity(
      user,
      entityId,
      type,
      userId
    );
    return `Successfully unassigned user from entity.`;
  }

  @Query(() => PaginatedEntity)
  async assignedEntities(
    @UserEntity() user: User,
    @Args() args: EntityConnectionArgs
  ): Promise<PaginatedEntity> {
    args.assignedToId = user.id;
    if (args.createdByUserId) {
      const createdBy = await this.prisma.user.findFirst({
        where: { userId: args.createdByUserId },
      });
      if (!createdBy) {
        args.createdById = -1;
      } else {
        args.createdById = createdBy.id;
      }
    }
    return await this.entityService.getAllEntityWithPagination(user, args);
  }

  @Mutation(() => String)
  async removeEntityAttachment(
    @Args('id') id: number,
    @UserEntity() user: User
  ): Promise<String> {
    try {
      await this.entityService.deleteEntityAttachment(id, user);
      return `Attachment removed.`;
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  @Mutation(() => String)
  async editEntityAttachment(
    @UserEntity() user: User,
    @Args('id') id: number,
    @Args('description') description: string
  ): Promise<String> {
    await this.entityService.editEntityAttachment(user, id, description);
    return `Attachment updated.`;
  }

  @Query(() => BreakdownNotif)
  async breakdownCount() {
    const entity = await this.prisma.entity.findMany({
      where: { status: 'Breakdown' },
    });
    const breakdownNotifModal = {
      count: entity.length,
    };
    return breakdownNotifModal;
  }

  @Query(() => [EntityUsageHistory])
  async singleEntityUsageHistory(
    @UserEntity() user: User,
    @Args('entityId') entityId: number,
    @Args('from') from: Date,
    @Args('to') to: Date
  ): Promise<EntityUsageHistory[]> {
    return this.entityService.getEntityUsage(user, entityId, from, to);
  }

  @Mutation(() => String)
  async createEntityPeriodicMaintenanceTask(
    @UserEntity() user: User,
    @Args('periodicMaintenanceId') periodicMaintenanceId: number,
    @Args('name') name: string,
    @Args('parentTaskId', { nullable: true }) parentTaskId?: number
  ): Promise<String> {
    await this.entityService.createEntityPeriodicMaintenanceTask(
      user,
      periodicMaintenanceId,
      name,
      parentTaskId
    );
    return `Added task to periodic maintenance.`;
  }

  @Mutation(() => String)
  async toggleEntityPMTask(
    @UserEntity() user: User,
    @Args('id') id: number,
    @Args('complete') complete: boolean
  ): Promise<string> {
    await this.entityService.toggleEntityPMTask(user, id, complete);
    return `Task updated.`;
  }

  @Mutation(() => String)
  async deleteEntityPMTask(
    @UserEntity() user: User,
    @Args('id') id: number
  ): Promise<string> {
    await this.entityService.deleteEntityPMTask(user, id);
    return `Task deleted.`;
  }

  @Query(() => PaginatedEntity)
  async getAllEntityUtilization(
    @UserEntity() user: User,
    @Args() args: EntityConnectionArgs
  ): Promise<PaginatedEntity> {
    return await this.entityService.getEntityUtilizationWithPagination(
      user,
      args
    );
  }

  @Query(() => [AllEntityUsageHistory])
  async allEntityUsageHistory(
    @UserEntity() user: User,
    @Args('from') from: Date,
    @Args('to') to: Date,
    @Args('search', { nullable: true, type: () => String }) search: string,
    @Args('locationIds', { nullable: true, type: () => [Int] })
    locationIds: number[],
    @Args('zoneIds', { nullable: true, type: () => [Int] })
    zoneIds: number[],
    @Args('typeIds', { nullable: true, type: () => [Int] })
    typeIds: number[],
    @Args('measurement', { nullable: true, type: () => [String] })
    measurement: string[]
  ): Promise<AllEntityUsageHistory[]> {
    return this.entityService.getAllEntityUsageNew(
      user,
      from,
      to,
      search,
      locationIds,
      zoneIds,
      typeIds,
      measurement
    );
  }

  @Query(() => [AllGroupedEntityUsage])
  async getAllGroupedEntityUsage(
    @UserEntity() user: User,
    @Args('from') from: Date,
    @Args('to') to: Date,
    @Args('search', { nullable: true, type: () => String }) search: string,
    @Args('locationIds', { nullable: true, type: () => [Int] })
    locationIds: number[],
    @Args('zoneIds', { nullable: true, type: () => [Int] })
    zoneIds: number[],
    @Args('typeIds', { nullable: true, type: () => [Int] })
    typeIds: number[],
    @Args('measurement', { nullable: true, type: () => [String] })
    measurement: string[],
    @Args('entityTypes', { nullable: true, type: () => [String] })
    entityTypes: string[]
  ): Promise<AllGroupedEntityUsage[]> {
    return this.entityService.getAllGroupedEntityUsage(
      user,
      from,
      to,
      search,
      locationIds,
      zoneIds,
      typeIds,
      measurement,
      entityTypes
    );
  }

  @Query(() => [Entity])
  async getAllEntityWithoutPagination(
    @UserEntity() user: User,
    @Args() args: EntityConnectionArgs
  ): Promise<Entity[]> {
    return await this.entityService.getAllEntityWithoutPagination(user, args);
  }

  @Mutation(() => String)
  async toggleVerifyEntityPeriodicMaintenance(
    @UserEntity() user: User,
    @Args('id') id: number,
    @Args('verify') verify: boolean
  ): Promise<string> {
    await this.entityService.toggleVerifyEntityPeriodicMaintenance(
      user,
      id,
      verify
    );
    return `Periodic maintenance verification updated.`;
  }

  @Query(() => PaginatedEntityPeriodicMaintenance)
  async getAllEntityPeriodicMaintenance(
    @UserEntity() user: User,
    @Args() args: EntityPeriodicMaintenanceConnectionArgs
  ): Promise<PaginatedEntityPeriodicMaintenance> {
    return await this.entityService.getAllEntityPeriodicMaintenanceWithPagination(
      user,
      args
    );
  }

  @Query(() => PaginatedEntityPeriodicMaintenanceTask)
  async getAllEntityPeriodicMaintenanceTask(
    @UserEntity() user: User,
    @Args() args: EntityPeriodicMaintenanceConnectionArgs
  ): Promise<PaginatedEntityPeriodicMaintenanceTask> {
    return await this.entityService.getAllEntityPeriodicMaintenanceTasksWithPagination(
      user,
      args
    );
  }

  @Query(() => PMTaskStatusCount)
  async allEntityPMTaskStatusCount(
    @UserEntity() user: User,
    @Args() args: EntityPeriodicMaintenanceConnectionArgs
  ): Promise<PMTaskStatusCount> {
    return this.entityService.getAllEntityPMTaskStatusCount(user, args);
  }

  @Query(() => maintenanceStatusCount)
  async allEntityPMStatusCount(): Promise<maintenanceStatusCount> {
    return this.entityService.getAllEntityPMStatusCount();
  }

  @Query(() => PaginatedEntity)
  async getAllAssignedEntity(
    @UserEntity() user: User,
    @Args() args: EntityConnectionArgs
  ): Promise<PaginatedEntity> {
    return await this.entityService.getAllEntityWithPagination(user, args);
  }

  @Query(() => entityStatusCount)
  async allEntityStatusCount(
    @UserEntity() user: User,
    @Args() args: EntityConnectionArgs
  ): Promise<entityStatusCount> {
    return this.entityService.getAllEntityStatusCount(user, args);
  }
  @Query(() => entityBreakdownCount)
  async allEntityBreakdownCount(): Promise<entityBreakdownCount> {
    return this.entityService.getAllEntityBreakdownCount();
  }

  @Query(() => entityChecklistAndPMSummary)
  async getAllEntityChecklistAndPMSummary(
    @UserEntity() user: User
  ): Promise<entityChecklistAndPMSummary> {
    return this.entityService.getAllEntityChecklistAndPMSummary(user);
  }

  @Query(() => entityPMSummary)
  async getAllEntityPMSummary(
    @UserEntity() user: User
  ): Promise<entityPMSummary> {
    return this.entityService.getAllEntityPMSummary(user);
  }

  @Mutation(() => String)
  async toggleCompleteEntityRepairRequest(
    @UserEntity() user: User,
    @Args('id') id: number,
    @Args('complete') complete: boolean
  ): Promise<string> {
    await this.entityService.toggleCompleteEntityRepairRequest(
      user,
      id,
      complete
    );
    return `Repair request completion updated.`;
  }

  @Mutation(() => String)
  async toggleApproveEntityRepairRequest(
    @UserEntity() user: User,
    @Args('id') id: number,
    @Args('approve') approve: boolean
  ): Promise<string> {
    await this.entityService.toggleApproveEntityRepairRequest(
      user,
      id,
      approve
    );
    return `Repair request approval updated.`;
  }

  @Mutation(() => String)
  async updateEntityNote(
    @UserEntity() user: User,
    @Args('id') id: number,
    @Args('note', { nullable: true }) note: string
  ): Promise<string> {
    await this.entityService.updateEntityNote(user, id, note);
    return `Entity ${id}'s note updated.`;
  }
}
