import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { ZoneService } from './zone.service';
import { Zone } from './entities/zone.entity';
import { CreateZoneInput } from './dto/create-zone.input';
import { UpdateZoneInput } from './dto/update-zone.input';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from 'src/guards/gql-auth.guard';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { Permissions } from 'src/decorators/permissions.decorator';
import { UserEntity } from 'src/decorators/user.decorator';
import { User } from '@prisma/client';
import { PaginatedZone } from './dto/zone-connection.model';
import { ZoneConnectionArgs } from './dto/zone-connection.args';

@UseGuards(GqlAuthGuard, PermissionsGuard)
@Resolver(() => Zone)
export class ZoneResolver {
  constructor(private readonly zoneService: ZoneService) {}

  @Permissions('MODIFY_LOCATIONS')
  @Mutation(() => String)
  async createZone(
    @UserEntity() user: User,
    @Args('input') input: CreateZoneInput
  ) {
    await this.zoneService.create(user, input);
    return `Successfully created location.`;
  }

  @Query(() => PaginatedZone, { name: 'zones' })
  async findAll(@Args() args: ZoneConnectionArgs) {
    return await this.zoneService.findAll(args);
  }

  @Query(() => Zone, { name: 'zone' })
  async findOne(@Args('id', { type: () => Int }) id: number) {
    return await this.zoneService.findOne(id);
  }

  @Permissions('MODIFY_LOCATIONS')
  @Mutation(() => String)
  async updateZone(@Args('input') input: UpdateZoneInput) {
    await this.zoneService.update(input);
    return 'Successfully updated zone.';
  }

  @Permissions('MODIFY_LOCATIONS')
  @Mutation(() => String)
  async removeZone(@Args('id', { type: () => Int }) id: number) {
    await this.zoneService.remove(id);
    return 'Successfully removed zone.';
  }

  @Query(() => [Zone], { name: 'searchZone' })
  search(
    @Args('query', { nullable: true }) query: string,
    @Args('limit', { nullable: true }) limit: number
  ) {
    return this.zoneService.search(query, limit);
  }
}
