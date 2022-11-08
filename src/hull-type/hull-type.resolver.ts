import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { HullTypeService } from './hull-type.service';
import { HullType } from './entities/hull-type.entity';
import { CreateHullTypeInput } from './dto/create-hull-type.input';
import { UpdateHullTypeInput } from './dto/update-hull-type.input';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from 'src/guards/gql-auth.guard';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { Permissions } from 'src/decorators/permissions.decorator';
import { PaginatedHullType } from './dto/hull-type-connection.model';
import { HullTypeConnectionArgs } from './dto/hull-type-connection.args';

@UseGuards(GqlAuthGuard, PermissionsGuard)
@Resolver(() => HullType)
export class HullTypeResolver {
  constructor(private readonly hullTypeService: HullTypeService) {}

  @Permissions('MODIFY_HULL_TYPES')
  @Mutation(() => String)
  async createHullType(
    @Args('createHullTypeInput') createHullTypeInput: CreateHullTypeInput
  ) {
    await this.hullTypeService.create(createHullTypeInput);
    return 'Successfully created hull type.';
  }

  @Query(() => PaginatedHullType, { name: 'hullTypes' })
  async findAll(@Args() args: HullTypeConnectionArgs) {
    return this.hullTypeService.findAll(args);
  }

  @Query(() => HullType, { name: 'hullType' })
  async findOne(@Args('id', { type: () => Int }) id: number) {
    return await this.hullTypeService.findOne(id);
  }

  @Permissions('MODIFY_HULL_TYPES')
  @Mutation(() => String)
  async updateHullType(
    @Args('updateHullTypeInput') input: UpdateHullTypeInput
  ) {
    await this.hullTypeService.update(input);
    return 'Successfully updated hull type.';
  }

  @Permissions('MODIFY_HULL_TYPES')
  @Mutation(() => String)
  async removeHullType(@Args('id', { type: () => Int }) id: number) {
    await this.hullTypeService.remove(id);
    return 'Successfully removed hull type.';
  }
}
