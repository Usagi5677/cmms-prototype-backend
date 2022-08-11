import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { TypeService } from './type.service';
import { Type } from './entities/type.entity';
import { CreateTypeInput } from './dto/create-type.input';
import { UpdateTypeInput } from './dto/update-type.input';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from 'src/guards/gql-auth.guard';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { Permissions } from 'src/decorators/permissions.decorator';
import { PaginatedType } from './dto/type-connection.model';
import { TypeConnectionArgs } from './dto/type-connection.args';

@UseGuards(GqlAuthGuard, PermissionsGuard)
@Resolver(() => Type)
export class TypeResolver {
  constructor(private readonly typeService: TypeService) {}

  @Mutation(() => String)
  async createType(@Args('createTypeInput') input: CreateTypeInput) {
    await this.typeService.create(input);
    return 'Successfully created type.';
  }

  // @Permissions('VIEW_TYPES')
  @Query(() => PaginatedType, { name: 'types' })
  async findAll(@Args() args: TypeConnectionArgs) {
    return this.typeService.findAll(args);
  }

  @Mutation(() => String)
  async updateType(@Args('updateTypeInput') input: UpdateTypeInput) {
    await this.typeService.update(input);
    return 'Successfully updated type.';
  }

  @Mutation(() => String)
  async removeType(@Args('id', { type: () => Int }) id: number) {
    await this.typeService.remove(id);
    return 'Successfully removed type.';
  }
}
