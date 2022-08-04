import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { ChecklistService } from './checklist.service';
import { Checklist } from '../models/checklist.model';
import { ChecklistInput } from './dto/checklist.input';
import { UserEntity } from 'src/decorators/user.decorator';
import { User } from 'src/models/user.model';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from 'src/guards/gql-auth.guard';
import { ChecklistSummary } from './dto/checklist-summary';
import { ChecklistSummaryInput } from './dto/checklist-summary.input';

@UseGuards(GqlAuthGuard)
@Resolver(() => Checklist)
export class ChecklistResolver {
  constructor(private readonly checklistService: ChecklistService) {}

  @Query(() => Checklist, { name: 'checklist', nullable: true })
  findOne(@Args('input') input: ChecklistInput) {
    return this.checklistService.findOne(input);
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
    @Args('id') id: number,
    @Args('newHrs') newHrs: number
  ): Promise<string> {
    await this.checklistService.updateWorkingHours(id, newHrs);
    return `Checklist item updated.`;
  }

  @Mutation(() => String)
  async updateReading(
    @Args('id') id: number,
    @Args('reading') reading: number
  ): Promise<string> {
    await this.checklistService.updateReading(id, reading);
    return `Checklist item updated.`;
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
  async removeChecklistComment(@Args('id') id: number): Promise<string> {
    await this.checklistService.removeComment(id);
    return `Checklist comment removed.`;
  }

  @Query(() => [ChecklistSummary], { name: 'checklistSummary' })
  checklistSummary(@Args('input') input: ChecklistSummaryInput) {
    return this.checklistService.checklistSummary(input);
  }

  @Query(() => String)
  async testGenerateChecklist(): Promise<string> {
    await this.checklistService.generateChecklistsCron();
    return `Checklist generated.`;
  }
}
