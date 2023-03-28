import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { LocationService } from './location.service';
import { Location } from './entities/location.entity';
import { CreateLocationInput } from './dto/create-location.input';
import { UpdateLocationInput } from './dto/update-location.input';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from 'src/guards/gql-auth.guard';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { UserEntity } from 'src/decorators/user.decorator';
import { User } from 'src/models/user.model';
import { Permissions } from 'src/decorators/permissions.decorator';
import { PaginatedLocation } from './dto/location-connection.model';
import { LocationConnectionArgs } from './dto/location-connection.args';
import { LocationAssignInput } from './dto/location-assign.input';

@UseGuards(GqlAuthGuard, PermissionsGuard)
@Resolver(() => Location)
export class LocationResolver {
  constructor(private readonly locationService: LocationService) {}

  @Permissions('MODIFY_LOCATIONS')
  @Mutation(() => String)
  async createLocation(
    @UserEntity() user: User,
    @Args('input') input: CreateLocationInput
  ) {
    await this.locationService.create(user, input);
    return `Successfully created location.`;
  }

  @Query(() => PaginatedLocation, { name: 'locations' })
  async findAll(@Args() args: LocationConnectionArgs) {
    return await this.locationService.findAll(args);
  }

  @Query(() => Location, { name: 'location' })
  async findOne(@Args('id', { type: () => Int }) id: number) {
    return await this.locationService.findOne(id);
  }

  @Permissions('MODIFY_LOCATIONS')
  @Mutation(() => String)
  async updateLocation(
    @UserEntity() user: User,
    @Args('input') input: UpdateLocationInput
  ) {
    await this.locationService.update(user, input);
    return 'Successfully updated location.';
  }

  @Permissions('MODIFY_LOCATIONS')
  @Mutation(() => String)
  async removeLocation(@Args('id', { type: () => Int }) id: number) {
    await this.locationService.remove(id);
    return 'Successfully removed location.';
  }

  @Mutation(() => String)
  async assignUserToLocation(
    @UserEntity() user: User,
    @Args('input') input: LocationAssignInput
  ) {
    await this.locationService.assignUserToLocation(user, input);
    return 'Successfully completed bulk assignment.';
  }

  @Mutation(() => String)
  async bulkUnassignUserFromLocation(
    @UserEntity() user: User,
    @Args('input') input: LocationAssignInput
  ) {
    await this.locationService.bulkUnassignUserFromLocation(user, input);
    return 'Successfully completed bulk unassignment.';
  }

  @Permissions('MODIFY_LOCATIONS')
  @Mutation(() => String)
  async unassignUserFromLocation(@Args('id', { type: () => Int }) id: number) {
    await this.locationService.unassignUserFromLocation(id);
    return 'Successfully removed user from location.';
  }

  @Mutation(() => String)
  async assignEntityToLocation(
    @UserEntity() user: User,
    @Args('input') input: LocationAssignInput
  ) {
    await this.locationService.assignEntityToLocation(user, input);
    return 'Successfully assigned entity to location.';
  }

  @Mutation(() => String)
  async updateEntityLocation(
    @UserEntity() user: User,
    @Args('entityId') entityId: number,
    @Args('locationId') locationId: number
  ) {
    await this.locationService.updateEntityLocation(user, entityId, locationId);
    return `Successfully updated entity's location.`;
  }

  @Mutation(() => String)
  async updateLocationUser(
    @Args('id') id: number,
    @Args('locationId') locationId: number,
    @Args('userType') userType: string
  ) {
    await this.locationService.updateLocationUser(id, locationId, userType);
    return `Successfully updated location user.`;
  }

  @Query(() => [Location], { name: 'searchLocation' })
  search(
    @Args('query', { nullable: true }) query: string,
    @Args('limit', { nullable: true }) limit: number
  ) {
    return this.locationService.search(query, limit);
  }
}
