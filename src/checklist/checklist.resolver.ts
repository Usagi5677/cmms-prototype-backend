import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { ChecklistService } from './checklist.service';
import { Checklist } from '../models/checklist.model';
import { ChecklistInput } from './dto/checklist.input';
import { UserEntity } from 'src/decorators/user.decorator';
import { User } from 'src/models/user.model';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from 'src/guards/gql-auth.guard';
import { ChecklistSummary } from './dto/checklist-summary';
import { ChecklistSummaryInput } from './dto/checklist-summary.input';
import * as moment from 'moment';
import { IncompleteChecklistSummaryInput } from './dto/incomplete-checklist-summary.input';
import { IncompleteChecklistInput } from './dto/incomplete-checklist.input';
import { IncompleteChecklistSummary } from './dto/incomplete-checklist-summary';

@UseGuards(GqlAuthGuard)
@Resolver(() => Checklist)
export class ChecklistResolver {
  constructor(private readonly checklistService: ChecklistService) {}

  @Query(() => Checklist, { name: 'checklist', nullable: true })
  async findOne(@Args('input') input: ChecklistInput) {
    return await this.checklistService.findOne(input);
  }

  @Query(() => [Checklist], { nullable: true })
  async incompleteChecklists(
    @UserEntity() user: User,
    @Args('input') input: IncompleteChecklistInput
  ) {
    return await this.checklistService.incompleteChecklists(user, input);
  }

  @Query(() => [IncompleteChecklistSummary], { nullable: true })
  async incompleteChecklistSummary(
    @UserEntity() user: User,
    @Args('input') input: IncompleteChecklistSummaryInput
  ) {
    return await this.checklistService.incompleteChecklistSummary(user, input);
  }

  @Query(() => [Int, Int], { nullable: true })
  async incompleteChecklistsPastTwoDays(@UserEntity() user: User) {
    const yesterday = moment().subtract(1, 'day').startOf('day').toDate();
    const summary = await this.checklistService.incompleteChecklistSummary(
      user,
      { type: 'Daily', from: yesterday, to: new Date() }
    );
    return [summary[1]?.count ?? 0, summary[0]?.count ?? 0];
  }

  @Mutation(() => String)
  async toggleChecklistItem(
    @UserEntity() user: User,
    @Args('id') id: number,
    @Args('complete') complete: boolean
  ): Promise<string> {
    await this.checklistService.toggleChecklistItem(user, id, complete);
    return `Checklist item updated.`;
  }

  @Mutation(() => String)
  async updateWorkingHours(
    @UserEntity() user: User,
    @Args('id') id: number,
    @Args('newHrs') newHrs: number
  ): Promise<string> {
    await this.checklistService.updateWorkingHours(user, id, newHrs);
    return `Checklist updated.`;
  }

  @Mutation(() => String)
  async updateReading(
    @UserEntity() user: User,
    @Args('id') id: number,
    @Args('reading') reading: number
  ): Promise<string> {
    await this.checklistService.updateReading(user, id, reading);
    return `Checklist updated.`;
  }

  @Mutation(() => String)
  async updateDailyUsage(
    @UserEntity() user: User,
    @Args('id') id: number,
    @Args('hours') hours: number
  ): Promise<string> {
    await this.checklistService.updateDailyUsage(user, id, hours);
    return `Checklist updated.`;
  }

  @Mutation(() => String)
  async addChecklistComment(
    @UserEntity() user: User,
    @Args('checklistId') checklistId: number,
    @Args('comment') comment: string
  ): Promise<string> {
    await this.checklistService.addComment(user, checklistId, comment);
    return `Checklist comment added.`;
  }

  @Mutation(() => String)
  async addChecklistIssue(
    @UserEntity() user: User,
    @Args('checklistId') checklistId: number,
    @Args('itemId') itemId: number,
    @Args('comment') comment: string
  ): Promise<string> {
    await this.checklistService.addIssue(user, checklistId, itemId, comment);
    return `Checklist issue added.`;
  }

  @Mutation(() => String)
  async removeChecklistComment(
    @UserEntity() user: User,
    @Args('id') id: number
  ): Promise<string> {
    await this.checklistService.removeComment(user, id);
    return `Checklist comment removed.`;
  }

  @Query(() => [ChecklistSummary], { name: 'checklistSummary' })
  checklistSummary(@Args('input') input: ChecklistSummaryInput) {
    return this.checklistService.checklistSummary(input);
  }
}
