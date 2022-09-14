import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { SparePrService } from './spare-pr.service';
import { SparePr } from './entities/spare-pr.entity';
import { CreateSparePrInput } from './dto/create-spare-pr.input';
import { UpdateSparePrInput } from './dto/update-spare-pr.input';
import { UserEntity } from 'src/decorators/user.decorator';
import { User } from 'src/models/user.model';
import { GqlAuthGuard } from 'src/guards/gql-auth.guard';
import { UseGuards } from '@nestjs/common';
import { PaginatedSparePR } from './dto/spare-pr-connection.model';
import { SparePRConnectionArgs } from './dto/spare-pr-connection.args';

@UseGuards(GqlAuthGuard)
@Resolver(() => SparePr)
export class SparePrResolver {
  constructor(private readonly sparePrService: SparePrService) {}

  @Mutation(() => String)
  async createSparePR(
    @UserEntity() user: User,
    @Args('createSparePrInput') createSparePrInput: CreateSparePrInput
  ) {
    await this.sparePrService.create(user, createSparePrInput);
    return `Spare pr created`;
  }

  @Query(() => PaginatedSparePR, { name: 'sparePRs' })
  async findAll(
    @UserEntity() user: User,
    @Args() args: SparePRConnectionArgs
  ): Promise<PaginatedSparePR> {
    return await this.sparePrService.findAll(user, args);
  }

  @Query(() => SparePr, { name: 'sparePR' })
  async findOne(@Args('id', { type: () => Int }) id: number) {
    return await this.sparePrService.findOne(id);
  }

  @Mutation(() => String)
  async updateSparePR(
    @UserEntity() user: User,
    @Args('updateSparePrInput') updateSparePrInput: UpdateSparePrInput
  ) {
    await this.sparePrService.update(user, updateSparePrInput);
    return `Spare PR updated`;
  }

  @Mutation(() => String)
  async removeSparePR(@UserEntity() user: User, @Args('id') id: number) {
    await this.sparePrService.remove(user, id);
    return `Spare PR deleted`;
  }
}
