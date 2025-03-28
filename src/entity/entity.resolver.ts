/* eslint-disable @typescript-eslint/ban-types */
import { Resolver, Query, Args, Mutation, Int } from '@nestjs/graphql';
import { EntityService } from './entity.service';
import { InternalServerErrorException, UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from 'src/guards/gql-auth.guard';
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
import { PrismaService } from 'src/prisma/prisma.service';
import { GroupedLocationIncompleteTasks } from './dto/models/grouped-location-incomplete-tasks.model';
import { GroupedTypeRepairStats } from './dto/models/grouped-type-repair-stats.model';
import { GraphQLFloat } from 'graphql';
import { CreateEntityInput } from './dto/create-entity.input';
import { UpdateEntityInput } from './dto/update-entity.input';
import { entityTypeCount } from './dto/models/entityTypeCount.model';
import { configCount } from './dto/models/configCount.model';

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
    @Args('input') input: CreateEntityInput
  ): Promise<String> {
    await this.entityService.createEntity(user, input);
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
      return `Successfully removed entity.`;
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  // Permission checked in service
  @Mutation(() => String)
  async editEntity(
    @UserEntity() user: User,
    @Args('input') input: UpdateEntityInput
  ): Promise<String> {
    await this.entityService.editEntity(user, input);
    return `Successfully updated entity.`;
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

  @Query(() => [GroupedLocationIncompleteTasks])
  async getAllGroupedLocationIncompleteTasks(
    @UserEntity() user: User,
    @Args('from') from: Date,
    @Args('to') to: Date,
    @Args('search', { nullable: true, type: () => String }) search: string,
    @Args('divisionIds', { nullable: true, type: () => [Int] })
    divisionIds: number[],
    @Args('locationIds', { nullable: true, type: () => [Int] })
    locationIds: number[],
    @Args('zoneIds', { nullable: true, type: () => [Int] })
    zoneIds: number[],
    @Args('typeIds', { nullable: true, type: () => [Int] })
    typeIds: number[],
    @Args('measurement', { nullable: true, type: () => [String] })
    measurement: string[],
    @Args('entityType', { nullable: true, type: () => [String] })
    entityType: string[]
  ): Promise<GroupedLocationIncompleteTasks[]> {
    return this.entityService.getAllGroupedLocationIncompleteTasks(
      user,
      from,
      to,
      search,
      divisionIds,
      locationIds,
      zoneIds,
      typeIds,
      measurement,
      entityType
    );
  }

  @Query(() => [GroupedTypeRepairStats])
  async getAllGroupedTypeRepairStats(
    @UserEntity() user: User,
    @Args('from') from: Date,
    @Args('to') to: Date,
    @Args('search', { nullable: true, type: () => String }) search: string,
    @Args('divisionIds', { nullable: true, type: () => [Int] })
    divisionIds: number[],
    @Args('locationIds', { nullable: true, type: () => [Int] })
    locationIds: number[],
    @Args('zoneIds', { nullable: true, type: () => [Int] })
    zoneIds: number[],
    @Args('typeIds', { nullable: true, type: () => [Int] })
    typeIds: number[],
    @Args('measurement', { nullable: true, type: () => [String] })
    measurement: string[],
    @Args('entityType', { nullable: true, type: () => [String] })
    entityType: string[]
  ): Promise<GroupedTypeRepairStats[]> {
    return this.entityService.getAllGroupedTypeRepairStats(
      user,
      from,
      to,
      search,
      divisionIds,
      locationIds,
      zoneIds,
      typeIds,
      measurement,
      entityType
    );
  }

  @Query(() => [Entity])
  async getAllEntityWithoutPagination(
    @UserEntity() user: User,
    @Args() args: EntityConnectionArgs
  ): Promise<Entity[]> {
    return await this.entityService.getAllEntityWithoutPagination(user, args);
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

  @Mutation(() => String)
  async assignSubEntityToEntity(
    @UserEntity() user: User,
    @Args('id') id: number,
    @Args('parentEntityId') parentEntityId: number
  ): Promise<string> {
    await this.entityService.assignSubEntityToEntity(user, id, parentEntityId);
    return `Successfully assigned sub entity to entity.`;
  }

  @Mutation(() => String)
  async toggleEntityTransit(
    @UserEntity() user: User,
    @Args('id') id: number,
    @Args('complete') complete: boolean
  ): Promise<string> {
    await this.entityService.toggleEntityTransit(user, id, complete);
    return `Location Transition updated.`;
  }

  @Query(() => entityTypeCount)
  async getEntityTypeCount(): Promise<entityTypeCount> {
    return this.entityService.getEntityTypeCount();
  }

  @Query(() => configCount)
  async getConfigCount(): Promise<configCount> {
    return this.entityService.getConfigCount();
  }
}
