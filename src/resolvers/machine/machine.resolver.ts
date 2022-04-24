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

@UseGuards(GqlAuthGuard)
@Resolver(() => Machine)
export class MachineResolver {
  constructor(
    private machineService: MachineService,
    private userService: UserService,
    private prisma: PrismaService
  ) {}

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

  @Mutation(() => String)
  async removeMachine(@Args('machineId') machineId: number): Promise<String> {
    try {
      await this.machineService.deleteMachine(machineId);
      return `Machine removed.`;
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  @Mutation(() => String)
  async editMachine(
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
      registeredDate
    );
    return `Machine updated.`;
  }

  @Mutation(() => String)
  async setMachineStatus(
    @UserEntity() user: User,
    @Args('machineId') id: number,
    @Args('status', { type: () => MachineStatus }) status: MachineStatus
  ): Promise<String> {
    await this.machineService.setMachineStatus(user, id, status);
    return `Machine status set to ${status}.`;
  }

  @Query(() => Machine)
  async getSingleMachine(
    @UserEntity() user: User,
    @Args('machineId') machineId: number
  ) {
    return await this.machineService.getSingleMachine(user, machineId);
  }

  @Query(() => PaginatedMachine)
  async getAllMachine(
    @UserEntity() user: User,
    @Args() args: MachineConnectionArgs
  ): Promise<PaginatedMachine> {
    return await this.machineService.getMachineWithPagination(user, args);
  }

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

  @Mutation(() => String)
  async deleteMachineChecklistItem(
    @UserEntity() user: User,
    @Args('id') id: number
  ): Promise<String> {
    await this.machineService.deleteMachineChecklistItem(user, id);
    return `Checklist item deleted.`;
  }

  @Mutation(() => String)
  async toggleMachineChecklistItem(
    @UserEntity() user: User,
    @Args('id') id: number,
    @Args('complete') complete: boolean
  ): Promise<String> {
    await this.machineService.toggleMachineChecklistItem(user, id, complete);
    return `Checklist item updated.`;
  }

  @Mutation(() => String)
  async addMachinePeriodicMaintenance(
    @UserEntity() user: User,
    @Args('machineId') machineId: number,
    @Args('title') title: string,
    @Args('description') description: string,
    @Args('period') period: Date,
    @Args('notificationReminder') notificationReminder: Date
  ): Promise<String> {
    await this.machineService.createMachinePeriodicMaintenance(
      user,
      machineId,
      title,
      description,
      period,
      notificationReminder
    );
    return `Added periodic maintenance to machine.`;
  }

  @Mutation(() => String)
  async editMachinePeriodicMaintenance(
    @UserEntity() user: User,
    @Args('id') id: number,
    @Args('title') title: string,
    @Args('description') description: string
  ): Promise<String> {
    await this.machineService.editMachinePeriodicMaintenance(
      user,
      id,
      title,
      description
    );
    return `Periodic maintenance updated.`;
  }

  @Mutation(() => String)
  async deleteMachinePeriodicMaintenance(
    @UserEntity() user: User,
    @Args('id') id: number
  ): Promise<String> {
    await this.machineService.deleteMachinePeriodicMaintenance(user, id);
    return `Periodic maintenance deleted.`;
  }

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

  @Mutation(() => String)
  async setMachinePeriodicMaintenancePeriod(
    @UserEntity() user: User,
    @Args('id') id: number,
    @Args('period') period: Date
  ): Promise<String> {
    await this.machineService.setMachinePeriodicMaintenancePeriod(
      user,
      id,
      period
    );
    return `Periodic maintenance period updated.`;
  }

  @Mutation(() => String)
  async setMachinePeriodicMaintenanceNotificationReminder(
    @UserEntity() user: User,
    @Args('id') id: number,
    @Args('notificationReminder') notificationReminder: Date
  ): Promise<String> {
    await this.machineService.setMachinePeriodicMaintenanceNotificationReminder(
      user,
      id,
      notificationReminder
    );
    return `Periodic maintenance notification reminder updated.`;
  }

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

  @Mutation(() => String)
  async deleteMachineRepair(
    @UserEntity() user: User,
    @Args('id') id: number
  ): Promise<String> {
    await this.machineService.deleteMachineRepair(user, id);
    return `Repair deleted.`;
  }

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

  @Mutation(() => String)
  async deleteMachineSparePR(
    @UserEntity() user: User,
    @Args('id') id: number
  ): Promise<String> {
    await this.machineService.deleteMachineSparePR(user, id);
    return `Spare PR deleted.`;
  }

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

  @Mutation(() => String)
  async deleteMachineBreakdown(
    @UserEntity() user: User,
    @Args('id') id: number
  ): Promise<String> {
    await this.machineService.deleteMachineBreakdown(user, id);
    return `Breakdown deleted.`;
  }

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
  async getAllMachineRepairOfMachine(
    @UserEntity() user: User,
    @Args() args: MachineRepairConnectionArgs
  ): Promise<PaginatedMachineRepair> {
    return await this.machineService.getMachineRepairWithPagination(user, args);
  }

  @Query(() => PaginatedMachineBreakdown)
  async getAllMachineBreakdownOfMachine(
    @UserEntity() user: User,
    @Args() args: MachineBreakdownConnectionArgs
  ): Promise<PaginatedMachineBreakdown> {
    return await this.machineService.getMachineBreakdownWithPagination(
      user,
      args
    );
  }

  @Query(() => PaginatedMachineSparePR)
  async getAllMachineSparePROfMachine(
    @UserEntity() user: User,
    @Args() args: MachineSparePRConnectionArgs
  ): Promise<PaginatedMachineSparePR> {
    return await this.machineService.getMachineSparePRWithPagination(
      user,
      args
    );
  }

  @Mutation(() => String)
  async assignUsersToMachine(
    @UserEntity() user: User,
    @Args('machineId') machineId: number,
    @Args('userIds', { type: () => [Int] }) userIds: number[]
  ): Promise<String> {
    await this.machineService.assignUserToMachine(user, machineId, userIds);
    return `Successfully assigned user${
      userIds.length > 1 ? 's' : ''
    } to machine.`;
  }

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
}
