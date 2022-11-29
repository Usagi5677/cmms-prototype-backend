import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { BrandService } from './brand.service';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from 'src/guards/gql-auth.guard';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { Permissions } from 'src/decorators/permissions.decorator';
import { UserEntity } from 'src/decorators/user.decorator';
import { User } from 'src/models/user.model';
import { Brand } from './entities/brand.entity';
import { PaginatedBrand } from './dto/brand-connection.model';
import { BrandConnectionArgs } from './dto/brand-connection.args';
import { UpdateBrandInput } from './dto/update-brand.input';
import { CreateBrandInput } from './dto/create-brand.input';
import { BrandAssignInput } from './dto/brand-assign.input';

@UseGuards(GqlAuthGuard, PermissionsGuard)
@Resolver(() => Brand)
export class BrandResolver {
  constructor(private readonly brandService: BrandService) {}

  @Permissions('MODIFY_BRANDS')
  @Mutation(() => String)
  async createBrand(
    @UserEntity() user: User,
    @Args('input') input: CreateBrandInput
  ) {
    await this.brandService.create(user, input);
    return 'Successfully created brand.';
  }

  @Query(() => PaginatedBrand, { name: 'brands' })
  async findAll(@Args() args: BrandConnectionArgs) {
    return this.brandService.findAll(args);
  }

  @Query(() => Brand, { name: 'brand' })
  async findOne(@Args('id', { type: () => Int }) id: number) {
    return await this.brandService.findOne(id);
  }

  @Permissions('MODIFY_BRANDS')
  @Mutation(() => String)
  async updateBrand(@Args('input') input: UpdateBrandInput) {
    await this.brandService.update(input);
    return 'Successfully updated brand.';
  }

  @Permissions('MODIFY_BRANDS')
  @Mutation(() => String)
  async removeBrand(@Args('id', { type: () => Int }) id: number) {
    await this.brandService.remove(id);
    return 'Successfully removed brand.';
  }

  @Mutation(() => String)
  async bulkAssignBrandToEntity(
    @UserEntity() user: User,
    @Args('input') input: BrandAssignInput
  ) {
    await this.brandService.bulkAssignBrandToEntity(user, input);
    return 'Successfully assigned brand to entity.';
  }

  @Mutation(() => String)
  async updateEntityBrand(
    @UserEntity() user: User,
    @Args('entityId') entityId: number,
    @Args('brandId') brandId: number
  ) {
    await this.brandService.updateEntityBrand(user, entityId, brandId);
    return `Successfully updated entity's brand.`;
  }
}
