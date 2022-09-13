import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { RepairService } from './repair.service';
import { Repair } from './entities/repair.entity';
import { CreateRepairInput } from './dto/create-repair.input';
import { UpdateRepairInput } from './dto/update-repair.input';
import { UserEntity } from 'src/decorators/user.decorator';
import { User } from 'src/models/user.model';
import { RepairConnectionArgs } from './dto/repair-connection.args';
import { GqlAuthGuard } from 'src/guards/gql-auth.guard';
import { UseGuards } from '@nestjs/common';
import { PaginatedRepair } from './dto/repair-connection.model';
import { CreateRepairCommentInput } from './dto/create-repair-comment.input';

@UseGuards(GqlAuthGuard)
@Resolver(() => Repair)
export class RepairResolver {
  constructor(private readonly repairService: RepairService) {}

  @Mutation(() => String)
  async createRepair(
    @UserEntity() user: User,
    @Args('createRepairInput') createRepairInput: CreateRepairInput
  ) {
    await this.repairService.create(user, createRepairInput);
    return `Repair created`;
  }

  @Query(() => PaginatedRepair, { name: 'repairs' })
  async findAll(
    @UserEntity() user: User,
    @Args() args: RepairConnectionArgs
  ): Promise<PaginatedRepair> {
    return await this.repairService.findAll(user, args);
  }

  @Query(() => Repair, { name: 'repair' })
  async findOne(@Args('id', { type: () => Int }) id: number) {
    return await this.repairService.findOne(id);
  }

  @Mutation(() => String)
  async updateRepair(
    @UserEntity() user: User,
    @Args('updateRepairInput') updateRepairInput: UpdateRepairInput
  ) {
    await this.repairService.update(user, updateRepairInput);
    return `Repair updated`;
  }

  @Mutation(() => String)
  async removeRepair(@UserEntity() user: User, @Args('id') id: number) {
    await this.repairService.remove(user, id);
    return `Repair deleted`;
  }

  @Mutation(() => String)
  async addRepairComment(
    @UserEntity() user: User,
    @Args('createRepairCommentInput')
    createRepairCommentInput: CreateRepairCommentInput
  ): Promise<string> {
    await this.repairService.addRepairComment(user, createRepairCommentInput);
    return `Repair comment type ${createRepairCommentInput.type} added.`;
  }

  @Mutation(() => String)
  async removeRepairComment(
    @UserEntity() user: User,
    @Args('id') id: number
  ): Promise<string> {
    await this.repairService.removeRepairComment(user, id);
    return `Repair comment deleted.`;
  }
}
