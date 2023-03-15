import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { DivisionService } from './division.service';
import { Division } from './entities/division.entity';
import { CreateDivisionInput } from './dto/create-division.input';
import { UpdateDivisionInput } from './dto/update-division.input';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { Permissions } from 'src/decorators/permissions.decorator';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from 'src/guards/gql-auth.guard';
import { UserEntity } from 'src/decorators/user.decorator';
import { User } from 'src/models/user.model';
import { PaginatedDivision } from './dto/division-connection.model';
import { DivisionConnectionArgs } from './dto/division-connection.args';
import { DivisionAssignInput } from './dto/division-assign.input';

@UseGuards(GqlAuthGuard, PermissionsGuard)
@Resolver(() => Division)
export class DivisionResolver {
  constructor(private readonly divisionService: DivisionService) {}

  @Permissions('MODIFY_DIVISIONS')
  @Mutation(() => String)
  async createDivision(
    @UserEntity() user: User,
    @Args('input') input: CreateDivisionInput
  ) {
    await this.divisionService.create(user, input);
    return `Successfully created division.`;
  }

  @Query(() => PaginatedDivision, { name: 'divisions' })
  async findAll(@Args() args: DivisionConnectionArgs) {
    return await this.divisionService.findAll(args);
  }

  @Query(() => Division, { name: 'division' })
  async findOne(@Args('id', { type: () => Int }) id: number) {
    return await this.divisionService.findOne(id);
  }

  @Permissions('MODIFY_DIVISIONS')
  @Mutation(() => String)
  async updateDivision(@Args('input') input: UpdateDivisionInput) {
    await this.divisionService.update(input);
    return 'Successfully updated division.';
  }

  @Permissions('MODIFY_DIVISIONS')
  @Mutation(() => String)
  async removeDivision(@Args('id', { type: () => Int }) id: number) {
    await this.divisionService.remove(id);
    return 'Successfully removed division.';
  }

  @Permissions('MODIFY_DIVISIONS')
  @Mutation(() => String)
  async unassignUserFromDivision(@Args('id', { type: () => Int }) id: number) {
    await this.divisionService.unassignUserFromDivision(id);
    return 'Successfully removed user from division.';
  }

  @Mutation(() => String)
  async assignUserToDivision(
    @UserEntity() user: User,
    @Args('input') input: DivisionAssignInput
  ) {
    await this.divisionService.assignUserToDivision(user, input);
    return 'Successfully completed bulk assignment.';
  }

  @Mutation(() => String)
  async bulkUnassignUserFromDivision(
    @UserEntity() user: User,
    @Args('input') input: DivisionAssignInput
  ) {
    await this.divisionService.bulkUnassignUserFromDivision(user, input);
    return 'Successfully completed bulk unassignment.';
  }

  @Query(() => [Division], { name: 'searchDivision' })
  search(
    @Args('query', { nullable: true }) query: string,
    @Args('limit', { nullable: true }) limit: number
  ) {
    return this.divisionService.search(query, limit);
  }

  @Mutation(() => String)
  async updateEntityDivision(
    @Args('entityId') entityId: number,
    @Args('divisionId') divisionId: number
  ) {
    await this.divisionService.updateEntityDivision(entityId, divisionId);
    return `Successfully updated entity's division.`;
  }

  @Mutation(() => String)
  async assignEntityToDivision(@Args('input') input: DivisionAssignInput) {
    await this.divisionService.assignEntityToDivision(input);
    return 'Successfully assigned entity to division.';
  }
}
