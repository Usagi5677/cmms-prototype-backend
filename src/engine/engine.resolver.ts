import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { EngineService } from './engine.service';
import { Engine } from './entities/engine.entity';
import { CreateEngineInput } from './dto/create-engine.input';
import { UpdateEngineInput } from './dto/update-engine.input';
import { UseGuards } from '@nestjs/common';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { GqlAuthGuard } from 'src/guards/gql-auth.guard';
import { Permissions } from 'src/decorators/permissions.decorator';
import { UserEntity } from 'src/decorators/user.decorator';
import { User } from 'src/models/user.model';
import { PaginatedEngine } from './dto/engine-connection.model';
import { EngineConnectionArgs } from './dto/engine-connection.args';

@UseGuards(GqlAuthGuard, PermissionsGuard)
@Resolver(() => Engine)
export class EngineResolver {
  constructor(private readonly engineService: EngineService) {}

  @Permissions('MODIFY_ENGINES')
  @Mutation(() => String)
  async createEngine(
    @UserEntity() user: User,
    @Args('input') input: CreateEngineInput
  ) {
    await this.engineService.create(user, input);
    return `Successfully created engine.`;
  }
  @Query(() => PaginatedEngine, { name: 'engines' })
  async findAll(@Args() args: EngineConnectionArgs) {
    return await this.engineService.findAll(args);
  }

  @Query(() => Engine, { name: 'engine' })
  async findOne(@Args('id', { type: () => Int }) id: number) {
    return await this.engineService.findOne(id);
  }

  @Permissions('MODIFY_ENGINES')
  @Mutation(() => String)
  async updateEngine(@Args('input') input: UpdateEngineInput) {
    await this.engineService.update(input);
    return 'Successfully updated engine.';
  }

  @Permissions('MODIFY_ENGINES')
  @Mutation(() => String)
  async removeEngine(@Args('id', { type: () => Int }) id: number) {
    await this.engineService.remove(id);
    return 'Successfully removed engine.';
  }
}
