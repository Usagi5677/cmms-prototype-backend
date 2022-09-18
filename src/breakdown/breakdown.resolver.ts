import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { BreakdownService } from './breakdown.service';
import { Breakdown } from './entities/breakdown.entity';
import { CreateBreakdownInput } from './dto/create-breakdown.input';
import { UpdateBreakdownInput } from './dto/update-breakdown.input';
import { PaginatedBreakdown } from './dto/breakdown-connection.model';
import { UserEntity } from 'src/decorators/user.decorator';
import { User } from 'src/models/user.model';
import { BreakdownConnectionArgs } from './dto/breakdown-connection.args';
import { CreateBreakdownCommentInput } from './dto/create-breakdown-comment.input';
import { CreateBreakdownDetailInput } from './dto/create-breakdown-detail.input';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from 'src/guards/gql-auth.guard';

@UseGuards(GqlAuthGuard)
@Resolver(() => Breakdown)
export class BreakdownResolver {
  constructor(private readonly breakdownService: BreakdownService) {}

  @Mutation(() => String)
  async createBreakdown(
    @UserEntity() user: User,
    @Args('createBreakdownInput') createBreakdownInput: CreateBreakdownInput
  ) {
    await this.breakdownService.create(user, createBreakdownInput);
    return `Breakdown created`;
  }

  @Query(() => PaginatedBreakdown, { name: 'breakdowns' })
  async findAll(
    @UserEntity() user: User,
    @Args() args: BreakdownConnectionArgs
  ): Promise<PaginatedBreakdown> {
    return await this.breakdownService.findAll(user, args);
  }

  @Query(() => Breakdown, { name: 'breakdown' })
  findOne(@Args('id') id: number) {
    return this.breakdownService.findOne(id);
  }

  @Mutation(() => String)
  async updateBreakdown(
    @UserEntity() user: User,
    @Args('updateBreakdownInput') updateBreakdownInput: UpdateBreakdownInput
  ) {
    await this.breakdownService.update(user, updateBreakdownInput);
    return `Breakdown updated`;
  }

  @Mutation(() => String)
  async removeBreakdown(@UserEntity() user: User, @Args('id') id: number) {
    await this.breakdownService.remove(user, id);
    return `Breakdown deleted`;
  }

  @Mutation(() => String)
  async addBreakdownComment(
    @UserEntity() user: User,
    @Args('createBreakdownCommentInput')
    createBreakdownCommentInput: CreateBreakdownCommentInput
  ): Promise<string> {
    await this.breakdownService.addBreakdownComment(
      user,
      createBreakdownCommentInput
    );
    return `Breakdown comment type ${createBreakdownCommentInput.type} added.`;
  }

  @Mutation(() => String)
  async removeBreakdownComment(
    @UserEntity() user: User,
    @Args('id') id: number
  ): Promise<string> {
    await this.breakdownService.removeBreakdownComment(user, id);
    return `Breakdown comment deleted.`;
  }

  @Mutation(() => String)
  async addBreakdownDetail(
    @UserEntity() user: User,
    @Args('createBreakdownDetailInput')
    createBreakdownDetailInput: CreateBreakdownDetailInput
  ): Promise<string> {
    await this.breakdownService.addBreakdownDetail(
      user,
      createBreakdownDetailInput
    );
    return `Breakdown detail '${createBreakdownDetailInput.description}' added.`;
  }

  @Mutation(() => String)
  async removeBreakdownDetail(
    @UserEntity() user: User,
    @Args('id') id: number
  ): Promise<string> {
    await this.breakdownService.removeBreakdownDetail(user, id);
    return `Breakdown detail deleted.`;
  }

  @Mutation(() => String)
  async toggleComplete(
    @UserEntity() user: User,
    @Args('id') id: number,
    @Args('complete') complete: boolean
  ): Promise<string> {
    await this.breakdownService.toggleComplete(user, id, complete);
    return `Breakdown completion updated.`;
  }
}
