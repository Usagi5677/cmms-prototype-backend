/* eslint-disable @typescript-eslint/ban-types */
import {
  InternalServerErrorException,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  Args,
  Int,
  Mutation,
  Query,
  Resolver,
  Subscription,
} from '@nestjs/graphql';
import { GqlAuthGuard } from '../../guards/gql-auth.guard';
import { Roles } from 'src/decorators/roles.decorator';
import { RolesGuard } from 'src/guards/roles.guard';
import { UserEntity } from 'src/decorators/user.decorator';
import { User } from 'src/models/user.model';
import { UserService } from 'src/services/user.service';
import { PrismaService } from 'nestjs-prisma';
import { Transportation } from 'src/models/transportation.model';
import { TransportationService } from 'src/services/transportation.service';
import { TransportationConnectionArgs } from 'src/models/args/transportation-connection.args';
import { PaginatedTransportation } from 'src/models/pagination/transportation-connection.model';
import { PeriodicMaintenanceStatus } from 'src/common/enums/periodicMaintenanceStatus';
import { RepairStatus } from 'src/common/enums/repairStatus';
import { SparePRStatus } from 'src/common/enums/sparePRStatus';
import { BreakdownStatus } from 'src/common/enums/breakdownStatus';
import { PaginatedTransportationBreakdown } from 'src/models/pagination/transportation-breakdown-connection.model';
import { TransportationBreakdownConnectionArgs } from 'src/models/args/transportation-breakdown-connection.args';
import { PaginatedTransportationRepair } from 'src/models/pagination/transportation-repair-connection.model';
import { TransportationRepairConnectionArgs } from 'src/models/args/transportation-repair-connection.args';
import { PaginatedTransportationSparePR } from 'src/models/pagination/transportation-sparePR-connection.model';
import { TransportationSparePRConnectionArgs } from 'src/models/args/transportation-sparePR-connection.args';
import { PaginatedTransportationPeriodicMaintenance } from 'src/models/pagination/transportation-periodic-maintenance-connection.model';
import { TransportationPeriodicMaintenanceConnectionArgs } from 'src/models/args/transportation-periodic-maintenance-connection.args';
import { PaginatedTransportationHistory } from 'src/models/pagination/transportation-history-connection.model';
import { TransportationHistoryConnectionArgs } from 'src/models/args/transportation-history-connection.args';
import { TransportationStatus } from 'src/common/enums/transportationStatus';
import { TransportationReport } from 'src/models/transportation-report.model';
import { BreakdownNotif } from 'src/models/breakdownNotif.model';
import { TransportationUsageHistory } from 'src/models/transportation-usage-history.model';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { Permissions } from 'src/decorators/permissions.decorator';

@UseGuards(GqlAuthGuard, PermissionsGuard)
@Resolver(() => Transportation)
export class TransportationResolver {
  constructor(
    private transportationService: TransportationService,
    private userService: UserService,
    private prisma: PrismaService
  ) {}

  @Permissions('ADD_TRANSPORTATION')
  @Mutation(() => String)
  async createTransportation(
    @UserEntity() user: User,
    @Args('machineNumber') machineNumber: string,
    @Args('model') model: string,
    @Args('type') type: string,
    @Args('location') location: string,
    @Args('department') department: string,
    @Args('engine') engine: string,
    @Args('measurement') measurement: string,
    @Args('currentMileage') currentMileage: number,
    @Args('lastServiceMileage') lastServiceMileage: number,
    @Args('transportType') transportType: string,
    @Args('registeredDate') registeredDate: Date
  ): Promise<String> {
    await this.transportationService.createTransportation(
      user,
      machineNumber,
      model,
      type,
      location,
      department,
      engine,
      measurement,
      currentMileage,
      lastServiceMileage,
      transportType,
      registeredDate
    );
    return `Successfully created transportation.`;
  }

  @Permissions('DELETE_TRANSPORTATION')
  @Mutation(() => String)
  async removeTransportation(
    @UserEntity() user: User,
    @Args('transportationId') transportationId: number
  ): Promise<String> {
    try {
      await this.transportationService.deleteTransportation(
        transportationId,
        user
      );
      return `Transportation removed.`;
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  @Permissions('EDIT_TRANSPORTATION')
  @Mutation(() => String)
  async editTransportation(
    @UserEntity() user: User,
    @Args('id') id: number,
    @Args('machineNumber') machineNumber: string,
    @Args('model') model: string,
    @Args('type') type: string,
    @Args('location') location: string,
    @Args('department') department: string,
    @Args('engine') engine: string,
    @Args('measurement') measurement: string,
    @Args('currentMileage') currentMileage: number,
    @Args('lastServiceMileage') lastServiceMileage: number,
    @Args('transportType') transportType: string,
    @Args('registeredDate') registeredDate: Date
  ): Promise<String> {
    await this.transportationService.editTransportation(
      user,
      id,
      machineNumber,
      model,
      type,
      location,
      department,
      engine,
      measurement,
      currentMileage,
      lastServiceMileage,
      transportType,
      registeredDate
    );
    return `Transportation updated.`;
  }

  @Permissions('EDIT_TRANSPORTATION')
  @Mutation(() => String)
  async setTransportationStatus(
    @UserEntity() user: User,
    @Args('transportationId') transportationId: number,
    @Args('status', { type: () => TransportationStatus })
    status: TransportationStatus
  ): Promise<String> {
    await this.transportationService.setTransportationStatus(
      user,
      transportationId,
      status
    );
    return `Transportation status set to ${status}.`;
  }

  @Permissions('VIEW_VEHICLE', 'VIEW_VESSEL')
  @Query(() => Transportation)
  async getSingleTransportation(
    @UserEntity() user: User,
    @Args('transportationId') transportationId: number
  ) {
    return await this.transportationService.getSingleTransportation(
      user,
      transportationId
    );
  }

  @Permissions('VIEW_ALL_VESSELS')
  @Query(() => PaginatedTransportation)
  async getAllTransportationVessels(
    @UserEntity() user: User,
    @Args() args: TransportationConnectionArgs
  ): Promise<PaginatedTransportation> {
    return await this.transportationService.getTransportationWithPagination(
      user,
      args
    );
  }

  @Permissions('VIEW_ALL_VEHICLES')
  @Query(() => PaginatedTransportation)
  async getAllTransportationVehicles(
    @UserEntity() user: User,
    @Args() args: TransportationConnectionArgs
  ): Promise<PaginatedTransportation> {
    return await this.transportationService.getTransportationWithPagination(
      user,
      args
    );
  }

  @Permissions('ADD_TRANSPORTATION_CHECKLIST')
  @Mutation(() => String)
  async addTransportationChecklistItem(
    @UserEntity() user: User,
    @Args('transportationId') transportationId: number,
    @Args('description') description: string,
    @Args('type') type: string
  ): Promise<String> {
    await this.transportationService.createTransportationChecklistItem(
      user,
      transportationId,
      description,
      type
    );
    return `Added checklist item to transportation.`;
  }

  @Permissions('EDIT_TRANSPORTATION_CHECKLIST')
  @Mutation(() => String)
  async editTransportationChecklistItem(
    @UserEntity() user: User,
    @Args('id') id: number,
    @Args('description') description: string,
    @Args('type') type: string
  ): Promise<String> {
    await this.transportationService.editTransportationChecklistItem(
      user,
      id,
      description,
      type
    );
    return `Checklist item updated.`;
  }

  @Permissions('DELETE_TRANSPORTATION_CHECKLIST')
  @Mutation(() => String)
  async deleteTransportationChecklistItem(
    @UserEntity() user: User,
    @Args('id') id: number
  ): Promise<String> {
    await this.transportationService.deleteTransportationChecklistItem(
      user,
      id
    );
    return `Checklist item deleted.`;
  }

  @Permissions('EDIT_TRANSPORTATION_CHECKLIST')
  @Mutation(() => String)
  async toggleTransportationChecklistItem(
    @UserEntity() user: User,
    @Args('id', { type: () => [Int] }) id: number[],
    @Args('currentMeterReading') currentMeterReading: number,
    @Args('workingHour') workingHour: number,
    @Args('uncheckId', { type: () => [Int] }) uncheckId: number[]
  ): Promise<String> {
    await this.transportationService.toggleTransportationChecklistItem(
      user,
      id,
      currentMeterReading,
      workingHour,
      uncheckId
    );
    return `Checklist item updated.`;
  }

  @Permissions('ADD_TRANSPORTATION_PERIODIC_MAINTENANCE')
  @Mutation(() => String)
  async addTransportationPeriodicMaintenance(
    @UserEntity() user: User,
    @Args('transportationId') transportationId: number,
    @Args('title') title: string,
    @Args('description') description: string,
    @Args('period') period: number,
    @Args('notificationReminder') notificationReminder: number,
    @Args('fixedDate') fixedDate: Date
  ): Promise<String> {
    await this.transportationService.createTransportationPeriodicMaintenance(
      user,
      transportationId,
      title,
      description,
      period,
      notificationReminder,
      fixedDate
    );
    return `Added periodic maintenance to transportation.`;
  }

  @Permissions('EDIT_TRANSPORTATION_PERIODIC_MAINTENANCE')
  @Mutation(() => String)
  async editTransportationPeriodicMaintenance(
    @UserEntity() user: User,
    @Args('id') id: number,
    @Args('title') title: string,
    @Args('description') description: string,
    @Args('period') period: number,
    @Args('notificationReminder') notificationReminder: number
  ): Promise<String> {
    await this.transportationService.editTransportationPeriodicMaintenance(
      user,
      id,
      title,
      description,
      period,
      notificationReminder
    );
    return `Periodic maintenance updated.`;
  }

  @Permissions('DELETE_TRANSPORTATION_PERIODIC_MAINTENANCE')
  @Mutation(() => String)
  async deleteTransportationPeriodicMaintenance(
    @UserEntity() user: User,
    @Args('id') id: number
  ): Promise<String> {
    await this.transportationService.deleteTransportationPeriodicMaintenance(
      user,
      id
    );
    return `Periodic maintenance deleted.`;
  }

  @Permissions('EDIT_TRANSPORTATION_PERIODIC_MAINTENANCE')
  @Mutation(() => String)
  async setTransportationPeriodicMaintenanceStatus(
    @UserEntity() user: User,
    @Args('id') id: number,
    @Args('status', { type: () => PeriodicMaintenanceStatus })
    status: PeriodicMaintenanceStatus
  ): Promise<String> {
    await this.transportationService.setTransportationPeriodicMaintenanceStatus(
      user,
      id,
      status
    );
    return `Periodic maintenance status updated.`;
  }

  @Permissions('ADD_TRANSPORTATION_REPAIR')
  @Mutation(() => String)
  async addTransportationRepair(
    @UserEntity() user: User,
    @Args('transportationId') transportationId: number,
    @Args('title') title: string,
    @Args('description') description: string
  ): Promise<String> {
    await this.transportationService.createTransportationRepair(
      user,
      transportationId,
      title,
      description
    );
    return `Added repair to transportation.`;
  }

  @Permissions('EDIT_TRANSPORTATION_REPAIR')
  @Mutation(() => String)
  async editTransportationRepair(
    @UserEntity() user: User,
    @Args('id') id: number,
    @Args('title') title: string,
    @Args('description') description: string
  ): Promise<String> {
    await this.transportationService.editTransportationRepair(
      user,
      id,
      title,
      description
    );
    return `Repair updated.`;
  }

  @Permissions('DELETE_TRANSPORTATION_REPAIR')
  @Mutation(() => String)
  async deleteTransportationRepair(
    @UserEntity() user: User,
    @Args('id') id: number
  ): Promise<String> {
    await this.transportationService.deleteTransportationRepair(user, id);
    return `Repair deleted.`;
  }

  @Permissions('EDIT_TRANSPORTATION_REPAIR')
  @Mutation(() => String)
  async setTransportationRepairStatus(
    @UserEntity() user: User,
    @Args('id') id: number,
    @Args('status', { type: () => RepairStatus })
    status: RepairStatus
  ): Promise<String> {
    await this.transportationService.setTransportationRepairStatus(
      user,
      id,
      status
    );
    return `Repair status updated.`;
  }

  @Permissions('ADD_TRANSPORTATION_SPARE_PR')
  @Mutation(() => String)
  async addTransportationSparePR(
    @UserEntity() user: User,
    @Args('transportationId') transportationId: number,
    @Args('requestedDate') requestedDate: Date,
    @Args('title') title: string,
    @Args('description') description: string
  ): Promise<String> {
    await this.transportationService.createTransportationSparePR(
      user,
      transportationId,
      requestedDate,
      title,
      description
    );
    return `Added Spare PR to transportation.`;
  }

  @Permissions('EDIT_TRANSPORTATION_SPARE_PR')
  @Mutation(() => String)
  async editTransportationSparePR(
    @UserEntity() user: User,
    @Args('id') id: number,
    @Args('requestedDate') requestedDate: Date,
    @Args('title') title: string,
    @Args('description') description: string
  ): Promise<String> {
    await this.transportationService.editTransportationSparePR(
      user,
      id,
      requestedDate,
      title,
      description
    );
    return `Spare PR updated.`;
  }

  @Permissions('DELETE_TRANSPORTATION_SPARE_PR')
  @Mutation(() => String)
  async deleteTransportationSparePR(
    @UserEntity() user: User,
    @Args('id') id: number
  ): Promise<String> {
    await this.transportationService.deleteTransportationSparePR(user, id);
    return `Spare PR deleted.`;
  }

  @Permissions('EDIT_TRANSPORTATION_SPARE_PR')
  @Mutation(() => String)
  async setTransportationSparePRStatus(
    @UserEntity() user: User,
    @Args('id') id: number,
    @Args('status', { type: () => SparePRStatus })
    status: SparePRStatus
  ): Promise<String> {
    await this.transportationService.setTransportationSparePRStatus(
      user,
      id,
      status
    );
    return `Spare PR status updated.`;
  }

  @Permissions('ADD_TRANSPORTATION_BREAKDOWN')
  @Mutation(() => String)
  async addTransportationBreakdown(
    @UserEntity() user: User,
    @Args('transportationId') transportationId: number,
    @Args('title') title: string,
    @Args('description') description: string
  ): Promise<String> {
    await this.transportationService.createTransportationBreakdown(
      user,
      transportationId,
      title,
      description
    );
    return `Added Breakdown to transportation.`;
  }

  @Permissions('EDIT_TRANSPORTATION_BREAKDOWN')
  @Mutation(() => String)
  async editTransportationBreakdown(
    @UserEntity() user: User,
    @Args('id') id: number,
    @Args('title') title: string,
    @Args('description') description: string,
    @Args('estimatedDateOfRepair') estimatedDateOfRepair: Date
  ): Promise<String> {
    await this.transportationService.editTransportationBreakdown(
      user,
      id,
      title,
      description,
      estimatedDateOfRepair
    );
    return `Breakdown updated.`;
  }

  @Permissions('DELETE_TRANSPORTATION_BREAKDOWN')
  @Mutation(() => String)
  async deleteTransportationBreakdown(
    @UserEntity() user: User,
    @Args('id') id: number
  ): Promise<String> {
    await this.transportationService.deleteTransportationBreakdown(user, id);
    return `Breakdown deleted.`;
  }

  @Permissions('EDIT_TRANSPORTATION_BREAKDOWN')
  @Mutation(() => String)
  async setTransportationBreakdownStatus(
    @UserEntity() user: User,
    @Args('id') id: number,
    @Args('status', { type: () => BreakdownStatus })
    status: BreakdownStatus
  ): Promise<String> {
    await this.transportationService.setTransportationBreakdownStatus(
      user,
      id,
      status
    );
    return `Breakdown status updated.`;
  }

  @Query(() => PaginatedTransportationPeriodicMaintenance)
  async getAllPeriodicMaintenanceOfTransportation(
    @UserEntity() user: User,
    @Args() args: TransportationPeriodicMaintenanceConnectionArgs
  ): Promise<PaginatedTransportationPeriodicMaintenance> {
    return await this.transportationService.getTransportationPeriodicMaintenanceWithPagination(
      user,
      args
    );
  }

  @Query(() => PaginatedTransportationSparePR)
  async getAllSparePROfTransportation(
    @UserEntity() user: User,
    @Args() args: TransportationSparePRConnectionArgs
  ): Promise<PaginatedTransportationSparePR> {
    return await this.transportationService.getTransportationSparePRWithPagination(
      user,
      args
    );
  }

  @Query(() => PaginatedTransportationRepair)
  async getAllRepairOfTransportation(
    @UserEntity() user: User,
    @Args() args: TransportationRepairConnectionArgs
  ): Promise<PaginatedTransportationRepair> {
    return await this.transportationService.getTransportationRepairWithPagination(
      user,
      args
    );
  }

  @Query(() => PaginatedTransportationBreakdown)
  async getAllBreakdownOfTransportation(
    @UserEntity() user: User,
    @Args() args: TransportationBreakdownConnectionArgs
  ): Promise<PaginatedTransportationBreakdown> {
    return await this.transportationService.getTransportationBreakdownWithPagination(
      user,
      args
    );
  }

  @Query(() => PaginatedTransportationHistory)
  async getAllHistoryOfTransportation(
    @UserEntity() user: User,
    @Args() args: TransportationHistoryConnectionArgs
  ): Promise<PaginatedTransportationHistory> {
    return await this.transportationService.getTransportationHistoryWithPagination(
      user,
      args
    );
  }

  @Permissions('ASSIGN_USER_TO_TRANSPORTATION')
  @Mutation(() => String)
  async assignUserToTransportation(
    @UserEntity() user: User,
    @Args('transportationId') transportationId: number,
    @Args('userIds', { type: () => [Int] }) userIds: number[]
  ): Promise<String> {
    await this.transportationService.assignUserToTransportation(
      user,
      transportationId,
      userIds
    );
    return `Successfully assigned user${
      userIds.length > 1 ? 's' : ''
    } to transportation.`;
  }

  @Permissions('UNASSIGN_USER_TO_TRANSPORTATION')
  @Mutation(() => String)
  async unassignUserFromTransportation(
    @UserEntity() user: User,
    @Args('transportationId') transportationId: number,
    @Args('userId') userId: number
  ): Promise<string> {
    await this.transportationService.unassignUserFromTransportation(
      user,
      transportationId,
      userId
    );
    return `Successfully unassigned user from transportation.`;
  }

  @Query(() => PaginatedTransportation)
  async assignedTransportations(
    @UserEntity() user: User,
    @Args() args: TransportationConnectionArgs
  ): Promise<PaginatedTransportation> {
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
    return await this.transportationService.getTransportationWithPagination(
      user,
      args
    );
  }

  @Permissions('DELETE_TRANSPORTATION_ATTACHMENT')
  @Mutation(() => String)
  async removeTransportationAttachment(
    @Args('id') id: number,
    @UserEntity() user: User
  ): Promise<String> {
    try {
      await this.transportationService.deleteTransportationAttachment(id, user);
      return `Attachment removed.`;
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  @Permissions('EDIT_TRANSPORTATION_ATTACHMENT')
  @Mutation(() => String)
  async editTransportationAttachment(
    @UserEntity() user: User,
    @Args('id') id: number,
    @Args('description') description: string
  ): Promise<String> {
    await this.transportationService.editTransportationAttachment(
      user,
      id,
      description
    );
    return `Attachment updated.`;
  }

  @Permissions('VIEW_TRANSPORTATION_REPORT')
  @Query(() => [TransportationReport])
  async getTransportationReport(
    @UserEntity() user: User,
    @Args('from') from: Date,
    @Args('to') to: Date
  ): Promise<TransportationReport[]> {
    return this.transportationService.getTransportationReport(user, from, to);
  }

  @Query(() => BreakdownNotif)
  async breakdownVesselCount() {
    const transportation = await this.prisma.transportation.findMany({
      where: { status: 'Breakdown', transportType: 'Vessel' },
    });
    const breakdownNotifModal = {
      count: transportation.length,
    };
    return breakdownNotifModal;
  }

  @Query(() => BreakdownNotif)
  async breakdownVehicleCount() {
    const transportation = await this.prisma.transportation.findMany({
      where: { status: 'Breakdown', transportType: 'Vehicle' },
    });
    const breakdownNotifModal = {
      count: transportation.length,
    };
    return breakdownNotifModal;
  }

  @Query(() => [TransportationUsageHistory])
  async singleTransportationUsageHistory(
    @UserEntity() user: User,
    @Args('transportationId') transportationId: number,
    @Args('from') from: Date,
    @Args('to') to: Date
  ): Promise<TransportationUsageHistory[]> {
    return this.transportationService.getTransportationUsage(
      user,
      transportationId,
      from,
      to
    );
  }

  @Permissions('EDIT_TRANSPORTATION_USAGE')
  @Mutation(() => String)
  async editTransportationUsage(
    @UserEntity() user: User,
    @Args('id') id: number,
    @Args('currentMileage') currentMileage: number,
    @Args('lastServiceMileage') lastServiceMileage: number
  ): Promise<String> {
    await this.transportationService.editTransportationUsage(
      user,
      id,
      currentMileage,
      lastServiceMileage
    );
    return `Transportation usage updated.`;
  }
}
