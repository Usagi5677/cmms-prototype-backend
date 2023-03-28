import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UserAssignmentService } from './user-assignment.service';
import { UserAssignment } from './entities/user-assignment.entity';
import { CreateUserAssignmentInput } from './dto/create-user-assignment.input';
import { UpdateUserAssignmentInput } from './dto/update-user-assignment.input';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from 'src/guards/gql-auth.guard';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { CreateBrandInput } from 'src/brand/dto/create-brand.input';
import { UserEntity } from 'src/decorators/user.decorator';
import { Permissions } from 'src/decorators/permissions.decorator';
import { User } from 'src/models/user.model';
import { PaginatedUserAssignment } from './dto/user-assignment-connection.model';
import { UserAssignmentConnectionArgs } from './dto/user-assignment-connection.args';
import { UserAssignmentBulkCreateInput } from './dto/user-assignment-bulk-create.input';

@UseGuards(GqlAuthGuard, PermissionsGuard)
@Resolver(() => UserAssignment)
export class UserAssignmentResolver {
  constructor(private readonly userAssignmentService: UserAssignmentService) {}

  @Permissions('MODIFY_USER_ASSIGNMENTS')
  @Mutation(() => String)
  async createUserAssignment(
    @UserEntity() user: User,
    @Args('input') input: CreateUserAssignmentInput
  ) {
    await this.userAssignmentService.create(user, input);
    return 'Successfully created user assignment.';
  }

  @Query(() => PaginatedUserAssignment, { name: 'userAssignments' })
  async findAll(@Args() args: UserAssignmentConnectionArgs) {
    return this.userAssignmentService.findAll(args);
  }

  @Query(() => UserAssignment, { name: 'userAssignment' })
  async findOne(@Args('id', { type: () => Int }) id: number) {
    return await this.userAssignmentService.findOne(id);
  }

  @Permissions('MODIFY_USER_ASSIGNMENTS')
  @Mutation(() => String)
  async updateUserAssignment(@Args('input') input: UpdateUserAssignmentInput) {
    await this.userAssignmentService.update(input);
    return 'Successfully updated user assignment.';
  }

  @Permissions('MODIFY_USER_ASSIGNMENTS')
  @Mutation(() => String)
  async removeUserAssignment(@Args('id', { type: () => Int }) id: number) {
    await this.userAssignmentService.remove(id);
    return 'Successfully removed user assignment.';
  }

  @Permissions('MODIFY_USER_ASSIGNMENTS')
  @Mutation(() => String)
  async bulkCreateUserAssignment(
    @UserEntity() user: User,
    @Args('input') input: UserAssignmentBulkCreateInput
  ) {
    await this.userAssignmentService.bulkCreate(user, input);
    return 'Successfully bulk created user assignment.';
  }

  @Permissions('MODIFY_USER_ASSIGNMENTS')
  @Mutation(() => String)
  async bulkRemoveUserAssignment(
    @UserEntity() user: User,
    @Args('input') input: UserAssignmentBulkCreateInput
  ) {
    await this.userAssignmentService.bulkRemove(user, input);
    return 'Successfully bulk removed user assignment.';
  }
}
