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
}
