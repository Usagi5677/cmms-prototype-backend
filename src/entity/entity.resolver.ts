/* eslint-disable @typescript-eslint/ban-types */
import { Resolver, Query, Args, Mutation, Int } from '@nestjs/graphql';
import { EntityService } from './entity.service';
import { InternalServerErrorException, UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from 'src/guards/gql-auth.guard';
import { UserService } from 'src/services/user.service';
import { PrismaService } from 'nestjs-prisma';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { Permissions } from 'src/decorators/permissions.decorator';
import { UserEntity } from 'src/decorators/user.decorator';
import { User } from 'src/models/user.model';
import { EntityStatus } from 'src/common/enums/entityStatus';
import { PaginatedEntity } from './dto/paginations/entity-connection.model';
import { EntityConnectionArgs } from './dto/args/entity-connection.args';
import { PeriodicMaintenanceStatus } from 'src/common/enums/periodicMaintenanceStatus';
import { RepairStatus } from 'src/common/enums/repairStatus';
import { SparePRStatus } from 'src/common/enums/sparePRStatus';
import { BreakdownStatus } from 'src/common/enums/breakdownStatus';
import { PaginatedEntityPeriodicMaintenance } from './dto/paginations/entity-periodic-maintenance-connection.model';
import { EntityPeriodicMaintenanceConnectionArgs } from './dto/args/entity-periodic-maintenance-connection.args';
import { PaginatedEntitySparePR } from './dto/paginations/entity-sparePR-connection.model';
import { EntitySparePRConnectionArgs } from './dto/args/entity-sparePR-connection.args';
import { EntityRepairConnectionArgs } from './dto/args/entity-repair-connection.args';
import { PaginatedEntityRepair } from './dto/paginations/entity-repair-connection.model';
import { EntityBreakdownConnectionArgs } from './dto/args/entity-breakdown-connection.args';
import { PaginatedEntityBreakdown } from './dto/paginations/entity-breakdown-connection.model';
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

@UseGuards(GqlAuthGuard, PermissionsGuard)
@Resolver(() => Entity)
export class EntityResolver {
  constructor(
    private readonly entityService: EntityService,
    private userService: UserService,
    private prisma: PrismaService
  ) {}

  @Query(() => [Entity], { name: 'searchEntity' })
  search(
    @Args('query') query: string,
    @Args('limit', { nullable: true }) limit: number
  ) {
    return this.entityService.search(query, limit);
  }

  @Mutation(() => String)
  async createEntity(
    @UserEntity() user: User,
    @Args('typeId', { nullable: true }) typeId: number,
    @Args('machineNumber', { nullable: true }) machineNumber: string,
    @Args('model', { nullable: true }) model: string,
    @Args('zone', { nullable: true }) zone: string,
    @Args('location', { nullable: true }) location: string,
    @Args('department', { nullable: true }) department: string,
    @Args('engine', { nullable: true }) engine: string,
    @Args('measurement', { nullable: true }) measurement: string,
    @Args('currentRunning', { nullable: true }) currentRunning: number,
    @Args('lastService', { nullable: true }) lastService: number,
    @Args('currentMileage', { nullable: true }) currentMileage: number,
    @Args('lastServiceMileage', { nullable: true }) lastServiceMileage: number,
    @Args('brand', { nullable: true }) brand: string,
    @Args('registeredDate', { nullable: true }) registeredDate: Date
  ): Promise<String> {
    await this.entityService.createEntity(
      user,
      typeId,
      machineNumber,
      model,
      zone,
      location,
      department,
      engine,
      measurement,
      currentRunning,
      lastService,
      currentMileage,
      lastServiceMileage,
      brand,
      registeredDate
    );
    return `Successfully created entity.`;
  }

  @Permissions('DELETE_ENTITY')
  @Mutation(() => String)
  async removeEntity(
    @UserEntity() user: User,
    @Args('entityId') entityId: number
  ): Promise<String> {
    try {
      await this.entityService.deleteEntity(entityId, user);
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
    @Args('zone', { nullable: true }) zone: string,
    @Args('location', { nullable: true }) location: string,
    @Args('department', { nullable: true }) department: string,
    @Args('engine', { nullable: true }) engine: string,
    @Args('measurement', { nullable: true }) measurement: string,
    @Args('currentRunning', { nullable: true }) currentRunning: number,
    @Args('lastService', { nullable: true }) lastService: number,
    @Args('currentMileage', { nullable: true }) currentMileage: number,
    @Args('lastServiceMileage', { nullable: true }) lastServiceMileage: number,
    @Args('brand', { nullable: true }) brand: string,
    @Args('registeredDate', { nullable: true }) registeredDate: Date
  ): Promise<String> {
    await this.entityService.editEntity(
      user,
      id,
      typeId,
      machineNumber,
      model,
      zone,
      location,
      department,
      engine,
      measurement,
      currentRunning,
      lastService,
      currentMileage,
      lastServiceMileage,
      brand,
      registeredDate
    );
    return `Entity updated.`;
  }

  @Permissions('EDIT_ENTITY')
  @Mutation(() => String)
  async setEntityStatus(
    @UserEntity() user: User,
    @Args('entityId') entityId: number,
    @Args('status', { type: () => EntityStatus })
    status: EntityStatus
  ): Promise<String> {
    await this.entityService.setEntityStatus(user, entityId, status);
    return `Entity status set to ${status}.`;
  }

  @Permissions('VIEW_ENTITY')
  @Query(() => Entity)
  async getSingleEntity(
    @UserEntity() user: User,
    @Args('entityId') entityId: number
  ) {
    return await this.entityService.getSingleEntity(user, entityId);
  }

  @Permissions('VIEW_ALL_ENTITY')
  @Query(() => PaginatedEntity)
  async getAllEntity(
    @UserEntity() user: User,
    @Args() args: EntityConnectionArgs
  ): Promise<PaginatedEntity> {
    return await this.entityService.getAllEntityWithPagination(user, args);
  }

  @Permissions('ADD_ENTITY_PERIODIC_MAINTENANCE')
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
    return `Added periodic maintenance to entity.`;
  }

  @Permissions('EDIT_ENTITY_PERIODIC_MAINTENANCE')
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

  @Permissions('DELETE_ENTITY_PERIODIC_MAINTENANCE')
  @Mutation(() => String)
  async deleteEntityPeriodicMaintenance(
    @UserEntity() user: User,
    @Args('id') id: number
  ): Promise<String> {
    await this.entityService.deleteEntityPeriodicMaintenance(user, id);
    return `Periodic maintenance deleted.`;
  }

  @Permissions('EDIT_ENTITY_PERIODIC_MAINTENANCE')
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

  @Permissions('ADD_ENTITY_REPAIR_REQUEST')
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

  @Permissions('EDIT_ENTITY_REPAIR_REQUEST')
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

  @Permissions('DELETE_ENTITY_REPAIR_REQUEST')
  @Mutation(() => String)
  async deleteEntityRepairRequest(
    @UserEntity() user: User,
    @Args('id') id: number
  ): Promise<String> {
    await this.entityService.deleteEntityRepairRequest(user, id);
    return `Repair request deleted.`;
  }

  @Permissions('ADD_ENTITY_SPARE_PR')
  @Mutation(() => String)
  async addEntitySparePR(
    @UserEntity() user: User,
    @Args('entityId') entityId: number,
    @Args('requestedDate') requestedDate: Date,
    @Args('title') title: string,
    @Args('description') description: string
  ): Promise<String> {
    await this.entityService.createEntitySparePR(
      user,
      entityId,
      requestedDate,
      title,
      description
    );
    return `Added Spare PR to entity.`;
  }

  @Permissions('EDIT_ENTITY_SPARE_PR')
  @Mutation(() => String)
  async editEntitySparePR(
    @UserEntity() user: User,
    @Args('id') id: number,
    @Args('requestedDate') requestedDate: Date,
    @Args('title') title: string,
    @Args('description') description: string
  ): Promise<String> {
    await this.entityService.editEntitySparePR(
      user,
      id,
      requestedDate,
      title,
      description
    );
    return `Spare PR updated.`;
  }

  @Permissions('DELETE_ENTITY_SPARE_PR')
  @Mutation(() => String)
  async deleteEntitySparePR(
    @UserEntity() user: User,
    @Args('id') id: number
  ): Promise<String> {
    await this.entityService.deleteEntitySparePR(user, id);
    return `Spare PR deleted.`;
  }

  @Permissions('EDIT_ENTITY_SPARE_PR')
  @Mutation(() => String)
  async setEntitySparePRStatus(
    @UserEntity() user: User,
    @Args('id') id: number,
    @Args('status', { type: () => SparePRStatus })
    status: SparePRStatus
  ): Promise<String> {
    await this.entityService.setEntitySparePRStatus(user, id, status);
    return `Spare PR status updated.`;
  }

  @Permissions('ADD_ENTITY_BREAKDOWN')
  @Mutation(() => String)
  async addEntityBreakdown(
    @UserEntity() user: User,
    @Args('entityId') entityId: number,
    @Args('title') title: string,
    @Args('description') description: string
  ): Promise<String> {
    await this.entityService.createEntityBreakdown(
      user,
      entityId,
      title,
      description
    );
    return `Added Breakdown to entity.`;
  }

  @Permissions('EDIT_ENTITY_BREAKDOWN')
  @Mutation(() => String)
  async editEntityBreakdown(
    @UserEntity() user: User,
    @Args('id') id: number,
    @Args('title') title: string,
    @Args('description') description: string,
    @Args('estimatedDateOfRepair') estimatedDateOfRepair: Date
  ): Promise<String> {
    await this.entityService.editEntityBreakdown(
      user,
      id,
      title,
      description,
      estimatedDateOfRepair
    );
    return `Breakdown updated.`;
  }

  @Permissions('DELETE_ENTITY_BREAKDOWN')
  @Mutation(() => String)
  async deleteEntityBreakdown(
    @UserEntity() user: User,
    @Args('id') id: number
  ): Promise<String> {
    await this.entityService.deleteEntityBreakdown(user, id);
    return `Breakdown deleted.`;
  }

  @Permissions('EDIT_ENTITY_BREAKDOWN')
  @Mutation(() => String)
  async setEntityBreakdownStatus(
    @UserEntity() user: User,
    @Args('id') id: number,
    @Args('status', { type: () => BreakdownStatus })
    status: BreakdownStatus
  ): Promise<String> {
    await this.entityService.setEntityBreakdownStatus(user, id, status);
    return `Breakdown status updated.`;
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

  @Query(() => PaginatedEntitySparePR)
  async getAllSparePROfEntity(
    @UserEntity() user: User,
    @Args() args: EntitySparePRConnectionArgs
  ): Promise<PaginatedEntitySparePR> {
    return await this.entityService.getEntitySparePRWithPagination(user, args);
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

  @Query(() => PaginatedEntityBreakdown)
  async getAllBreakdownOfEntity(
    @UserEntity() user: User,
    @Args() args: EntityBreakdownConnectionArgs
  ): Promise<PaginatedEntityBreakdown> {
    return await this.entityService.getEntityBreakdownWithPagination(
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

  @Permissions('ASSIGN_USER_TO_ENTITY')
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

  @Permissions('UNASSIGN_USER_TO_ENTITY')
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

  @Permissions('DELETE_ENTITY_ATTACHMENT')
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

  @Permissions('EDIT_ENTITY_ATTACHMENT')
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
    @Args('to') to: Date
  ): Promise<AllEntityUsageHistory[]> {
    return this.entityService.getAllEntityUsage(user, from, to);
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
    @Args('assignedToId', { nullable: true }) assignedToId?: number
  ): Promise<PMTaskStatusCount> {
    return this.entityService.getAllEntityPMTaskStatusCount(user, assignedToId);
  }

  @Query(() => maintenanceStatusCount)
  async allEntityPMStatusCount(
    @UserEntity() user: User
  ): Promise<maintenanceStatusCount> {
    return this.entityService.getAllEntityPMStatusCount(user);
  }

  // Permission checked in service
  @Mutation(() => String)
  async editEntityLocation(
    @UserEntity() user: User,
    @Args('id') id: number,
    @Args('location') location: string
  ): Promise<String> {
    await this.entityService.editEntityLocation(user, id, location);
    return `Location updated.`;
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
    @Args('isAssigned', { nullable: true }) isAssigned?: boolean,
    @Args('entityType', { nullable: true }) entityType?: string
  ): Promise<entityStatusCount> {
    return this.entityService.getAllEntityStatusCount(
      user,
      isAssigned,
      entityType
    );
  }
}
