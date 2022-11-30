import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';

import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from 'src/guards/gql-auth.guard';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { Permissions } from 'src/decorators/permissions.decorator';
import { UserEntity } from 'src/decorators/user.decorator';
import { User } from 'src/models/user.model';
import { InterServiceColor } from './entities/inter-service-color.entity';
import { InterServiceColorService } from './inter-service-color.service';
import { CreateInterServiceColorInput } from './dto/create-inter-service-color.input';
import { PaginatedInterServiceColor } from './dto/inter-service-color-connection.model';
import { InterServiceColorConnectionArgs } from './dto/inter-service-color-connection.args';
import { UpdateInterServiceColorInput } from './dto/update-inter-service-color.input';

@UseGuards(GqlAuthGuard, PermissionsGuard)
@Resolver(() => InterServiceColor)
export class InterServiceColorResolver {
  constructor(
    private readonly interServiceColorService: InterServiceColorService
  ) {}

  @Permissions('MODIFY_INTER_SERVICE_COLOR')
  @Mutation(() => String)
  async createInterServiceColor(
    @UserEntity() user: User,
    @Args('input') input: CreateInterServiceColorInput
  ) {
    await this.interServiceColorService.create(user, input);
    return 'Successfully created inter service config.';
  }

  @Query(() => PaginatedInterServiceColor, { name: 'interServiceColors' })
  async findAll(@Args() args: InterServiceColorConnectionArgs) {
    return this.interServiceColorService.findAll(args);
  }

  @Query(() => InterServiceColor, { name: 'interServiceColor' })
  async findOne(@Args('id', { type: () => Int }) id: number) {
    return await this.interServiceColorService.findOne(id);
  }

  @Permissions('MODIFY_INTER_SERVICE_COLOR')
  @Mutation(() => String)
  async updateInterServiceColor(
    @Args('input') input: UpdateInterServiceColorInput
  ) {
    await this.interServiceColorService.update(input);
    return 'Successfully updated inter service color.';
  }

  @Permissions('MODIFY_INTER_SERVICE_COLOR')
  @Mutation(() => String)
  async removeInterServiceColor(@Args('id', { type: () => Int }) id: number) {
    await this.interServiceColorService.remove(id);
    return 'Successfully removed inter service color.';
  }
}
