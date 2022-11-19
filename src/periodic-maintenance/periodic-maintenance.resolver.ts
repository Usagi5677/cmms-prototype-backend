import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from 'src/guards/gql-auth.guard';
import { PeriodicMaintenance } from './dto/models/periodic-maintenance.model';
import { PeriodicMaintenanceService } from './periodic-maintenance.service';
import { PeriodicMaintenanceInput } from './dto/inputs/periodic-maintenance.input';
import { UserEntity } from 'src/decorators/user.decorator';
import { User } from 'src/models/user.model';
import { PeriodicMaintenanceConnection } from './dto/periodic-maintenance-connection.model';
import { PeriodicMaintenanceConnectionArgs } from './dto/periodic-maintenance.connection.args';
import { PeriodicMaintenanceSummary } from './dto/models/periodic-maintenance-summary.model';
import { pmStatusCount } from './dto/models/pmStatusCount.model';

@UseGuards(GqlAuthGuard)
@Resolver(() => PeriodicMaintenance)
export class PeriodicMaintenanceResolver {
  constructor(
    private readonly periodicMaintenanceService: PeriodicMaintenanceService
  ) {}

  @Query(() => PeriodicMaintenance, {
    name: 'periodicMaintenance',
    nullable: true,
  })
  findOne(@Args('input') input: PeriodicMaintenanceInput) {
    return this.periodicMaintenanceService.findOne(input);
  }

  @Query(() => PeriodicMaintenanceConnection, { name: 'periodicMaintenances' })
  async findAll(
    @UserEntity() user: User,
    @Args() args: PeriodicMaintenanceConnectionArgs
  ) {
    return await this.periodicMaintenanceService.findAll(user, args);
  }

  @Query(() => [PeriodicMaintenance])
  async getAllTemplatesOfOriginPM(
    @UserEntity() user: User,
    @Args('id') id: number
  ): Promise<PeriodicMaintenance[]> {
    return await this.periodicMaintenanceService.getAllTemplatesOfOriginPM(
      user,
      id
    );
  }
  @Mutation(() => String)
  async togglePeriodicMaintenanceTask(
    @UserEntity() user: User,
    @Args('id') id: number,
    @Args('complete') complete: boolean
  ): Promise<string> {
    await this.periodicMaintenanceService.togglePeriodicMaintenanceTask(
      user,
      id,
      complete
    );
    return `Task updated.`;
  }

  @Mutation(() => String)
  async createPeriodicMaintenanceTask(
    @UserEntity() user: User,
    @Args('periodicMaintenanceId') periodicMaintenanceId: number,
    @Args('name') name: string,
    @Args('parentTaskId', { nullable: true }) parentTaskId?: number
  ): Promise<string> {
    await this.periodicMaintenanceService.createPeriodicMaintenanceTask(
      user,
      periodicMaintenanceId,
      name,
      parentTaskId
    );
    return `Added task to periodic maintenance.`;
  }

  @Mutation(() => String)
  async deletePeriodicMaintenanceTask(
    @UserEntity() user: User,
    @Args('id') id: number
  ): Promise<string> {
    await this.periodicMaintenanceService.deletePeriodicMaintenanceTask(
      user,
      id
    );
    return `Task deleted.`;
  }

  @Mutation(() => String)
  async deletePeriodicMaintenance(
    @UserEntity() user: User,
    @Args('id') id: number
  ): Promise<string> {
    await this.periodicMaintenanceService.deletePeriodicMaintenance(user, id);
    return `Periodic Maintenance deleted.`;
  }
  @Mutation(() => String)
  async deleteOriginPeriodicMaintenance(
    @UserEntity() user: User,
    @Args('id') id: number
  ): Promise<string> {
    await this.periodicMaintenanceService.deleteOriginPeriodicMaintenance(
      user,
      id
    );
    return `Origin Periodic Maintenance deleted.`;
  }

  @Mutation(() => String)
  async assignPeriodicMaintenanceTemplate(
    @UserEntity() user: User,
    @Args('entityId') entityId: number,
    @Args('originId') originId: number
  ): Promise<string> {
    await this.periodicMaintenanceService.assignPeriodicMaintenanceTemplate(
      user,
      entityId,
      originId
    );
    return `Periodic Maintenance template assigned.`;
  }

  @Mutation(() => String)
  async createPeriodicMaintenance(
    @UserEntity() user: User,
    @Args('name') name: string,
    @Args('measurement') measurement: string,
    @Args('value', { nullable: true }) value: number,
    @Args('currentMeterReading', { nullable: true })
    currentMeterReading: number,
    @Args('recur', { nullable: true }) recur: boolean
  ): Promise<string> {
    await this.periodicMaintenanceService.createPeriodicMaintenance(
      user,
      name,
      measurement,
      value,
      currentMeterReading,
      recur
    );
    return `Periodic maintenance updated.`;
  }

  @Mutation(() => String)
  async editPeriodicMaintenance(
    @UserEntity() user: User,
    @Args('id') id: number,
    @Args('name') name: string,
    @Args('measurement', { nullable: true }) measurement: string,
    @Args('value', { nullable: true }) value: number,
    @Args('currentMeterReading', { nullable: true })
    currentMeterReading: number,
    @Args('recur', { nullable: true }) recur: boolean
  ): Promise<string> {
    await this.periodicMaintenanceService.editPeriodicMaintenance(
      user,
      id,
      name,
      measurement,
      value,
      currentMeterReading,
      recur
    );
    return `Periodic maintenance updated.`;
  }

  @Mutation(() => String)
  async toggleVerifyPeriodicMaintenance(
    @UserEntity() user: User,
    @Args('id') id: number,
    @Args('verify') verify: boolean
  ): Promise<string> {
    await this.periodicMaintenanceService.toggleVerifyPeriodicMaintenance(
      user,
      id,
      verify
    );
    return `Periodic maintenance verification updated.`;
  }

  @Mutation(() => String)
  async addPeriodicMaintenanceComment(
    @UserEntity() user: User,
    @Args('periodicMaintenanceId') periodicMaintenanceId: number,
    @Args('type') type: string,
    @Args('taskId', { nullable: true }) taskId: number,
    @Args('description') description: string
  ): Promise<string> {
    await this.periodicMaintenanceService.addPeriodicMaintenanceComment(
      user,
      type,
      periodicMaintenanceId,
      taskId,
      description
    );
    return `Periodic maintenance comment type ${type} added.`;
  }

  @Mutation(() => String)
  async removePeriodicMaintenanceComment(
    @UserEntity() user: User,
    @Args('id') id: number
  ): Promise<string> {
    await this.periodicMaintenanceService.removePeriodicMaintenanceComment(
      user,
      id
    );
    return `Periodic maintenance comment deleted.`;
  }

  @Mutation(() => String)
  async updatePeriodicMaintenanceReading(
    @UserEntity() user: User,
    @Args('id') id: number,
    @Args('reading') reading: number
  ): Promise<string> {
    await this.periodicMaintenanceService.updatePeriodicMaintenanceReading(
      user,
      id,
      reading
    );
    return `Periodic maintenance reading updated.`;
  }

  @Query(() => [PeriodicMaintenanceSummary])
  periodicMaintenanceSummary(
    @Args('entityId') entityId: number,
    @Args('from') from: Date,
    @Args('to') to: Date
  ) {
    return this.periodicMaintenanceService.periodicMaintenanceSummary(
      entityId,
      from,
      to
    );
  }

  @Query(() => [PeriodicMaintenanceSummary])
  allPeriodicMaintenanceSummary(
    @Args() args: PeriodicMaintenanceConnectionArgs
  ) {
    return this.periodicMaintenanceService.allPeriodicMaintenanceSummary(args);
  }

  @Mutation(() => String)
  async upsertPMNotificationReminder(
    @UserEntity() user: User,
    @Args('periodicMaintenanceId', { nullable: true })
    periodicMaintenanceId?: number,
    @Args('type', { nullable: true }) type?: string,
    @Args('hour', { nullable: true }) hour?: number,
    @Args('kilometer', { nullable: true }) kilometer?: number,
    @Args('day', { nullable: true }) day?: number,
    @Args('week', { nullable: true }) week?: number,
    @Args('month', { nullable: true }) month?: number
  ): Promise<string> {
    await this.periodicMaintenanceService.upsertPMNotificationReminder(
      user,
      periodicMaintenanceId,
      type,
      hour,
      kilometer,
      day,
      week,
      month
    );
    return `Periodic maintenance notification reminder upserted.`;
  }

  @Mutation(() => String)
  async activatePM(
    @UserEntity() user: User,
    @Args('id') id: number
  ): Promise<string> {
    await this.periodicMaintenanceService.activatePM(id);
    return `Activated periodic maintenance.`;
  }

  @Query(() => Boolean)
  async checkCopyPMExist(@Args('id') id: number): Promise<boolean> {
    return await this.periodicMaintenanceService.checkCopyPMExist(id);
  }

  @Query(() => PeriodicMaintenanceConnection)
  async getAllPMWithPagination(
    @UserEntity() user: User,
    @Args() args: PeriodicMaintenanceConnectionArgs
  ) {
    return await this.periodicMaintenanceService.getAllPMWithPagination(
      user,
      args
    );
  }

  @Query(() => pmStatusCount)
  async allPMStatusCount(
    @UserEntity() user: User,
    @Args() args: PeriodicMaintenanceConnectionArgs
  ): Promise<pmStatusCount> {
    return this.periodicMaintenanceService.getAllPMStatusCount(user, args);
  }
}
