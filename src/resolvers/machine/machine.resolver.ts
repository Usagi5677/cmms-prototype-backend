/* eslint-disable @typescript-eslint/ban-types */
import {
  Inject,
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
import { Machine } from 'src/models/machine.model';
import { MachineService } from 'src/services/machine.service';
import { MachineConnectionArgs } from 'src/models/args/machine-connection.args';
import { PaginatedMachine } from 'src/models/pagination/machine-connection.model';
import { PeriodicMaintenanceStatus } from 'src/common/enums/periodicMaintenanceStatus';
import { RepairStatus } from 'src/common/enums/repairStatus';
import { SparePRStatus } from 'src/common/enums/sparePRStatus';
import { BreakdownStatus } from 'src/common/enums/breakdownStatus';
import { MachineRepairConnectionArgs } from 'src/models/args/machine-repair-connection.args';
import { PaginatedMachineRepair } from 'src/models/pagination/machine-repair-connection.model';
import { PaginatedMachineBreakdown } from 'src/models/pagination/machine-breakdown-connection.model';
import { MachineBreakdownConnectionArgs } from 'src/models/args/machine-breakdown-connection.args';
import { PaginatedMachineSparePR } from 'src/models/pagination/machine-sparePR-connection.model';
import { MachineSparePRConnectionArgs } from 'src/models/args/machine-sparePR-connection.args';
import { MachineStatus } from 'src/common/enums/machineStatus';
import { PaginatedMachinePeriodicMaintenance } from 'src/models/pagination/machine-periodic-maintenance-connection.model';
import { MachinePeriodicMaintenanceConnectionArgs } from 'src/models/args/machine-periodic-maintenance-connection.args';
import { PaginatedMachineHistory } from 'src/models/pagination/machine-history-connection.model';
import { MachineHistoryConnectionArgs } from 'src/models/args/machine-history-connection.args';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { Permissions } from 'src/decorators/permissions.decorator';
import * as moment from 'moment';
import { MachineReport } from 'src/models/machine-report.model';
import { PUB_SUB } from 'src/resolvers/pubsub/pubsub.module';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { BreakdownNotif } from 'src/models/breakdownNotif.model';
import { MachineUsageHistory } from 'src/models/machine-usage-history.model';

@Resolver(() => Machine)
@UseGuards(GqlAuthGuard, PermissionsGuard)
export class MachineResolver {
  constructor(
    private machineService: MachineService,
    private userService: UserService,
    private prisma: PrismaService,
    @Inject(PUB_SUB) private readonly pubSub: RedisPubSub
  ) {}

  @Permissions('ADD_MACHINE')
  @Mutation(() => String)
  async createMachine(
    @UserEntity() user: User,
    @Args('machineNumber') machineNumber: string,
    @Args('model') model: string,
    @Args('type') type: string,
    @Args('zone') zone: string,
    @Args('location') location: string,
    @Args('currentRunningHrs') currentRunningHrs: number,
    @Args('lastServiceHrs') lastServiceHrs: number,
    @Args('registeredDate') registeredDate: Date
  ): Promise<String> {
    await this.machineService.createMachine(
      user,
      machineNumber,
      model,
      type,
      zone,
      location,
      currentRunningHrs,
      lastServiceHrs,
      registeredDate
    );
    return `Successfully created machine.`;
  }

  @Permissions('DELETE_MACHINE')
  @Mutation(() => String)
  async removeMachine(
    @UserEntity() user: User,
    @Args('machineId') machineId: number
  ): Promise<String> {
    try {
      await this.machineService.deleteMachine(machineId, user);
      return `Machine removed.`;
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  @Permissions('EDIT_MACHINE')
  @Mutation(() => String)
  async editMachine(
    @UserEntity() user: User,
    @Args('id') id: number,
    @Args('machineNumber') machineNumber: string,
    @Args('model') model: string,
    @Args('type') type: string,
    @Args('zone') zone: string,
    @Args('location') location: string,
    @Args('currentRunningHrs') currentRunningHrs: number,
    @Args('lastServiceHrs') lastServiceHrs: number,
    @Args('registeredDate') registeredDate: Date
  ): Promise<String> {
    await this.machineService.editMachine(
      id,
      machineNumber,
      model,
      type,
      zone,
      location,
      currentRunningHrs,
      lastServiceHrs,
      registeredDate,
      user
    );
    return `Machine updated.`;
  }

  @Permissions('EDIT_MACHINE')
  @Mutation(() => String)
  async setMachineStatus(
    @UserEntity() user: User,
    @Args('machineId') machineId: number,
    @Args('status', { type: () => MachineStatus }) status: MachineStatus
  ): Promise<String> {
    await this.machineService.setMachineStatus(user, machineId, status);
    return `Machine status set to ${status}.`;
  }

  @Permissions('VIEW_MACHINE')
  @Query(() => Machine)
  async getSingleMachine(
    @UserEntity() user: User,
    @Args('machineId') machineId: number
  ) {
    return await this.machineService.getSingleMachine(user, machineId);
  }

  @Permissions('VIEW_ALL_MACHINES')
  @Query(() => PaginatedMachine)
  async getAllMachine(
    @UserEntity() user: User,
    @Args() args: MachineConnectionArgs
  ): Promise<PaginatedMachine> {
    return await this.machineService.getMachineWithPagination(user, args);
  }

  @Permissions('ADD_MACHINE_CHECKLIST')
  @Mutation(() => String)
  async addMachineChecklistItem(
    @UserEntity() user: User,
    @Args('machineId') machineId: number,
    @Args('description') description: string,
    @Args('type') type: string
  ): Promise<String> {
    await this.machineService.createMachineChecklistItem(
      user,
      machineId,
      description,
      type
    );
    return `Added checklist item to machine.`;
  }

  @Permissions('EDIT_MACHINE_CHECKLIST')
  @Mutation(() => String)
  async editMachineChecklistItem(
    @UserEntity() user: User,
    @Args('id') id: number,
    @Args('description') description: string,
    @Args('type') type: string
  ): Promise<String> {
    await this.machineService.editMachineChecklistItem(
      user,
      id,
      description,
      type
    );
    return `Checklist item updated.`;
  }

  @Permissions('DELETE_MACHINE_CHECKLIST')
  @Mutation(() => String)
  async deleteMachineChecklistItem(
    @UserEntity() user: User,
    @Args('id') id: number
  ): Promise<String> {
    await this.machineService.deleteMachineChecklistItem(user, id);
    return `Checklist item deleted.`;
  }

  @Permissions('EDIT_MACHINE_CHECKLIST')
  @Mutation(() => String)
  async toggleMachineChecklistItem(
    @UserEntity() user: User,
    @Args('id', { type: () => [Int] }) id: number[],
    @Args('currentMeterReading') currentMeterReading: number,
    @Args('workingHour') workingHour: number,
    @Args('uncheckId', { type: () => [Int] }) uncheckId: number[]
  ): Promise<String> {
    await this.machineService.toggleMachineChecklistItem(
      user,
      id,
      currentMeterReading,
      workingHour,
      uncheckId
    );
    return `Checklist item updated.`;
  }

  @Permissions('ADD_MACHINE_PERIODIC_MAINTENANCE')
  @Mutation(() => String)
  async addMachinePeriodicMaintenance(
    @UserEntity() user: User,
    @Args('machineId') machineId: number,
    @Args('title') title: string,
    @Args('description') description: string,
    @Args('period') period: number,
    @Args('notificationReminder') notificationReminder: number,
    @Args('fixedDate') fixedDate: Date
  ): Promise<String> {
    await this.machineService.createMachinePeriodicMaintenance(
      user,
      machineId,
      title,
      description,
      period,
      notificationReminder,
      fixedDate
    );
    return `Added periodic maintenance to machine.`;
  }

  @Permissions('EDIT_MACHINE_PERIODIC_MAINTENANCE')
  @Mutation(() => String)
  async editMachinePeriodicMaintenance(
    @UserEntity() user: User,
    @Args('id') id: number,
    @Args('title') title: string,
    @Args('description') description: string,
    @Args('period') period: number,
    @Args('notificationReminder') notificationReminder: number
  ): Promise<String> {
    await this.machineService.editMachinePeriodicMaintenance(
      user,
      id,
      title,
      description,
      period,
      notificationReminder
    );
    return `Periodic maintenance updated.`;
  }

  @Permissions('DELETE_MACHINE_PERIODIC_MAINTENANCE')
  @Mutation(() => String)
  async deleteMachinePeriodicMaintenance(
    @UserEntity() user: User,
    @Args('id') id: number
  ): Promise<String> {
    await this.machineService.deleteMachinePeriodicMaintenance(user, id);
    return `Periodic maintenance deleted.`;
  }

  @Permissions('EDIT_MACHINE_PERIODIC_MAINTENANCE')
  @Mutation(() => String)
  async setMachinePeriodicMaintenanceStatus(
    @UserEntity() user: User,
    @Args('id') id: number,
    @Args('status', { type: () => PeriodicMaintenanceStatus })
    status: PeriodicMaintenanceStatus
  ): Promise<String> {
    await this.machineService.setMachinePeriodicMaintenanceStatus(
      user,
      id,
      status
    );
    return `Periodic maintenance status updated.`;
  }

  @Permissions('ADD_MACHINE_REPAIR')
  @Mutation(() => String)
  async addMachineRepair(
    @UserEntity() user: User,
    @Args('machineId') machineId: number,
    @Args('title') title: string,
    @Args('description') description: string
  ): Promise<String> {
    await this.machineService.createMachineRepair(
      user,
      machineId,
      title,
      description
    );
    return `Added repair to machine.`;
  }

  @Permissions('EDIT_MACHINE_REPAIR')
  @Mutation(() => String)
  async editMachineRepair(
    @UserEntity() user: User,
    @Args('id') id: number,
    @Args('title') title: string,
    @Args('description') description: string
  ): Promise<String> {
    await this.machineService.editMachineRepair(user, id, title, description);
    return `Repair updated.`;
  }

  @Permissions('DELETE_MACHINE_REPAIR')
  @Mutation(() => String)
  async deleteMachineRepair(
    @UserEntity() user: User,
    @Args('id') id: number
  ): Promise<String> {
    await this.machineService.deleteMachineRepair(user, id);
    return `Repair deleted.`;
  }

  @Permissions('EDIT_MACHINE_REPAIR')
  @Mutation(() => String)
  async setMachineRepairStatus(
    @UserEntity() user: User,
    @Args('id') id: number,
    @Args('status', { type: () => RepairStatus })
    status: RepairStatus
  ): Promise<String> {
    await this.machineService.setMachineRepairStatus(user, id, status);
    return `Repair status updated.`;
  }

  @Permissions('ADD_MACHINE_SPARE_PR')
  @Mutation(() => String)
  async addMachineSparePR(
    @UserEntity() user: User,
    @Args('machineId') machineId: number,
    @Args('requestedDate') requestedDate: Date,
    @Args('title') title: string,
    @Args('description') description: string
  ): Promise<String> {
    await this.machineService.createMachineSparePR(
      user,
      machineId,
      requestedDate,
      title,
      description
    );
    return `Added Spare PR to machine.`;
  }

  @Permissions('EDIT_MACHINE_SPARE_PR')
  @Mutation(() => String)
  async editMachineSparePR(
    @UserEntity() user: User,
    @Args('id') id: number,
    @Args('requestedDate') requestedDate: Date,
    @Args('title') title: string,
    @Args('description') description: string
  ): Promise<String> {
    await this.machineService.editMachineSparePR(
      user,
      id,
      requestedDate,
      title,
      description
    );
    return `Spare PR updated.`;
  }

  @Permissions('DELETE_MACHINE_SPARE_PR')
  @Mutation(() => String)
  async deleteMachineSparePR(
    @UserEntity() user: User,
    @Args('id') id: number
  ): Promise<String> {
    await this.machineService.deleteMachineSparePR(user, id);
    return `Spare PR deleted.`;
  }

  @Permissions('EDIT_MACHINE_SPARE_PR')
  @Mutation(() => String)
  async setMachineSparePRStatus(
    @UserEntity() user: User,
    @Args('id') id: number,
    @Args('status', { type: () => SparePRStatus })
    status: SparePRStatus
  ): Promise<String> {
    await this.machineService.setMachineSparePRStatus(user, id, status);
    return `Spare PR status updated.`;
  }

  @Permissions('ADD_MACHINE_BREAKDOWN')
  @Mutation(() => String)
  async addMachineBreakdown(
    @UserEntity() user: User,
    @Args('machineId') machineId: number,
    @Args('title') title: string,
    @Args('description') description: string
  ): Promise<String> {
    await this.machineService.createMachineBreakdown(
      user,
      machineId,
      title,
      description
    );
    return `Added Breakdown to machine.`;
  }

  @Permissions('EDIT_MACHINE_BREAKDOWN')
  @Mutation(() => String)
  async editMachineBreakdown(
    @UserEntity() user: User,
    @Args('id') id: number,
    @Args('title') title: string,
    @Args('description') description: string
  ): Promise<String> {
    await this.machineService.editMachineBreakdown(
      user,
      id,
      title,
      description
    );
    return `Breakdown updated.`;
  }

  @Permissions('DELETE_MACHINE_BREAKDOWN')
  @Mutation(() => String)
  async deleteMachineBreakdown(
    @UserEntity() user: User,
    @Args('id') id: number
  ): Promise<String> {
    await this.machineService.deleteMachineBreakdown(user, id);
    return `Breakdown deleted.`;
  }

  @Permissions('EDIT_MACHINE_BREAKDOWN')
  @Mutation(() => String)
  async setMachineBreakdownStatus(
    @UserEntity() user: User,
    @Args('id') id: number,
    @Args('status', { type: () => BreakdownStatus })
    status: BreakdownStatus
  ): Promise<String> {
    await this.machineService.setMachineBreakdownStatus(user, id, status);
    return `Breakdown status updated.`;
  }

  @Query(() => PaginatedMachineRepair)
  async getAllRepairOfMachine(
    @UserEntity() user: User,
    @Args() args: MachineRepairConnectionArgs
  ): Promise<PaginatedMachineRepair> {
    return await this.machineService.getMachineRepairWithPagination(user, args);
  }

  @Query(() => PaginatedMachineBreakdown)
  async getAllBreakdownOfMachine(
    @UserEntity() user: User,
    @Args() args: MachineBreakdownConnectionArgs
  ): Promise<PaginatedMachineBreakdown> {
    return await this.machineService.getMachineBreakdownWithPagination(
      user,
      args
    );
  }

  @Query(() => PaginatedMachineSparePR)
  async getAllSparePROfMachine(
    @UserEntity() user: User,
    @Args() args: MachineSparePRConnectionArgs
  ): Promise<PaginatedMachineSparePR> {
    return await this.machineService.getMachineSparePRWithPagination(
      user,
      args
    );
  }

  @Permissions('ASSIGN_USER_TO_MACHINE')
  @Mutation(() => String)
  async assignUserToMachine(
    @UserEntity() user: User,
    @Args('machineId') machineId: number,
    @Args('userIds', { type: () => [Int] }) userIds: number[]
  ): Promise<String> {
    await this.machineService.assignUserToMachine(user, machineId, userIds);
    return `Successfully assigned user${
      userIds.length > 1 ? 's' : ''
    } to machine.`;
  }

  @Permissions('UNASSIGN_USER_TO_MACHINE')
  @Mutation(() => String)
  async unassignUserFromMachine(
    @UserEntity() user: User,
    @Args('machineId') machineId: number,
    @Args('userId') userId: number
  ): Promise<string> {
    await this.machineService.unassignUserFromMachine(user, machineId, userId);
    return `Successfully unassigned user from machine.`;
  }

  @Permissions('VIEW_ALL_ASSIGNED_MACHINES')
  @Query(() => PaginatedMachine)
  async assignedMachines(
    @UserEntity() user: User,
    @Args() args: MachineConnectionArgs
  ): Promise<PaginatedMachine> {
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
    return await this.machineService.getMachineWithPagination(user, args);
  }

  @Query(() => PaginatedMachinePeriodicMaintenance)
  async getAllPeriodicMaintenanceOfMachine(
    @UserEntity() user: User,
    @Args() args: MachinePeriodicMaintenanceConnectionArgs
  ): Promise<PaginatedMachinePeriodicMaintenance> {
    return await this.machineService.getMachinePeriodicMaintenanceWithPagination(
      user,
      args
    );
  }

  @Query(() => PaginatedMachineHistory)
  async getAllHistoryOfMachine(
    @UserEntity() user: User,
    @Args() args: MachineHistoryConnectionArgs
  ): Promise<PaginatedMachineHistory> {
    return await this.machineService.getMachineHistoryWithPagination(
      user,
      args
    );
  }

  @Permissions('DELETE_MACHINE_ATTACHMENT')
  @Mutation(() => String)
  async removeMachineAttachment(
    @Args('id') id: number,
    @UserEntity() user: User
  ): Promise<String> {
    try {
      await this.machineService.deleteMachineAttachment(id, user);
      return `Attachment removed.`;
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  @Permissions('EDIT_MACHINE_ATTACHMENT')
  @Mutation(() => String)
  async editMachineAttachment(
    @UserEntity() user: User,
    @Args('id') id: number,
    @Args('description') description: string
  ): Promise<String> {
    await this.machineService.editMachineAttachment(user, id, description);
    return `Attachment updated.`;
  }

  @Permissions('VIEW_MACHINERY_REPORT')
  @Query(() => [MachineReport])
  async getMachineReport(
    @UserEntity() user: User,
    @Args('from') from: Date,
    @Args('to') to: Date
  ): Promise<MachineReport[]> {
    return this.machineService.getMachineReport(user, from, to);
  }

  @Query(() => BreakdownNotif)
  async breakdownMachineCount() {
    const machine = await this.prisma.machine.findMany({
      where: { status: 'Breakdown' },
    });
    const breakdownNotifModal = {
      count: machine.length,
    };
    return breakdownNotifModal;
  }

  @Query(() => [MachineUsageHistory])
  async singleMachineUsageHistory(
    @UserEntity() user: User,
    @Args('machineId') machineId: number,
    @Args('from') from: Date,
    @Args('to') to: Date
  ): Promise<MachineUsageHistory[]> {
    return this.machineService.getMachineUsage(user, machineId, from, to);
  }

  @Permissions('EDIT_MACHINE_USAGE')
  @Mutation(() => String)
  async editMachineUsage(
    @UserEntity() user: User,
    @Args('id') id: number,
    @Args('currentRunningHrs') currentRunningHrs: number,
    @Args('lastServiceHrs') lastServiceHrs: number
  ): Promise<String> {
    await this.machineService.editMachineUsage(
      user,
      id,
      currentRunningHrs,
      lastServiceHrs
    );
    return `Machine usage updated.`;
  }
}
