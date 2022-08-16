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

@UseGuards(GqlAuthGuard, PermissionsGuard)
@Resolver(() => Location)
export class LocationResolver {
  constructor(private readonly locationService: LocationService) {}

  @Permissions('MODIFY_LOCATIONS')
  @Mutation(() => String)
  async createLocation(
    @UserEntity() user: User,
    @Args('createLocationInput') createLocationInput: CreateLocationInput
  ) {
    await this.locationService.create(user, createLocationInput);
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
  @Mutation(() => Location)
  async updateLocation(
    @Args('updateLocationInput') updateLocationInput: UpdateLocationInput
  ) {
    await this.locationService.update(updateLocationInput);
    return 'Successfully updated type.';
  }

  @Permissions('MODIFY_LOCATIONS')
  @Mutation(() => Location)
  async removeLocation(@Args('id', { type: () => Int }) id: number) {
    await this.locationService.remove(id);
    return 'Successfully removed type.';
  }
}
