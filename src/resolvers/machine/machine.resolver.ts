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
    @Args('lastServiceHrs') lastServiceHrs: number
  ): Promise<String> {
    await this.machineService.createMachine(
      user,
      machineNumber,
      model,
      type,
      zone,
      location,
      currentRunningHrs,
      lastServiceHrs
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
    @Args('lastServiceHrs') lastServiceHrs: number
  ): Promise<String> {
    await this.machineService.editMachine(
      id,
      machineNumber,
      model,
      type,
      zone,
      location,
      currentRunningHrs,
      lastServiceHrs
    );
    return `Machine updated.`;
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
}
