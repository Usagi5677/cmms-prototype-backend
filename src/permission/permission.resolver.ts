import { Resolver, Query } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from 'src/guards/gql-auth.guard';
import { PermissionWithDescription } from './entities/permission-with-description.model';
import { PERMISSION_DESCRIPTIONS } from 'src/constants';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { Permissions } from 'src/decorators/permissions.decorator';

@UseGuards(GqlAuthGuard, PermissionsGuard)
@Resolver(() => PermissionWithDescription)
export class PermissionResolver {
  constructor() {}

  @Permissions('VIEW_PERMISSION')
  @Query(() => [PermissionWithDescription])
  permissions() {
    return PERMISSION_DESCRIPTIONS;
  }
}
