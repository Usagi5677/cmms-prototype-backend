import { UseGuards } from '@nestjs/common';
import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { Permissions } from 'src/decorators/permissions.decorator';
import { UserEntity } from 'src/decorators/user.decorator';
import { GqlAuthGuard } from 'src/guards/gql-auth.guard';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { User } from 'src/models/user.model';
import { AssignmentService } from './assignment.service';
import { AssignmentConnectionArgs } from './dto/assignment-connection.args';
import { PaginatedAssignment } from './dto/assignment-connection.model';
import { BulkAssignInput } from './dto/bulk-assign.input';
import { EntityAssignment } from './entities/entity-assign.model';

@UseGuards(GqlAuthGuard, PermissionsGuard)
@Permissions('ASSIGN_TO_ENTITY')
@Resolver(() => EntityAssignment)
export class AssignmentResolver {
  constructor(private readonly assignmentService: AssignmentService) {}
  @Query(() => PaginatedAssignment)
  async assignments(@Args() args: AssignmentConnectionArgs) {
    return await this.assignmentService.findAll(args);
  }

  @Mutation(() => String)
  async bulkAssign(
    @UserEntity() user: User,
    @Args('input') input: BulkAssignInput
  ) {
    await this.assignmentService.bulkAssign(user, input);
    return 'Successfully completed bulk assignment.';
  }
}
