/* eslint-disable @typescript-eslint/ban-types */
import {
  InternalServerErrorException,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  Args,
  Int,
  Mutation,
  Query,
  Resolver,
  Subscription,
} from '@nestjs/graphql';
import { GqlAuthGuard } from '../../guards/gql-auth.guard';
import { Roles } from 'src/decorators/roles.decorator';
import { RolesGuard } from 'src/guards/roles.guard';
import { UserEntity } from 'src/decorators/user.decorator';
import { User } from 'src/models/user.model';
import { UserService } from 'src/services/user.service';
import { PrismaService } from 'nestjs-prisma';
import { PermissionRole } from 'src/models/permission-role.model';
import { PermissionRoleService } from 'src/services/permissionRole.service';
import { PaginatedPermissionRole } from 'src/models/pagination/permission-role-connection.model';
import { PermissionRoleConnectionArgs } from 'src/models/args/permission-role-connection.args';
import { PermissionEnum } from 'src/common/enums/permission';
import { Permissions } from 'src/decorators/permissions.decorator';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { Roles as RoleModel } from 'src/models/roles.model';

@UseGuards(GqlAuthGuard, PermissionsGuard)
@Resolver(() => PermissionRole)
export class PermissionRoleResolver {
  constructor(
    private permissionRoleService: PermissionRoleService,
    private userService: UserService,
    private prisma: PrismaService
  ) {}

  @Query(() => PaginatedPermissionRole)
  async getAllRoles(
    @UserEntity() user: User,
    @Args() args: PermissionRoleConnectionArgs
  ): Promise<PaginatedPermissionRole> {
    return await this.permissionRoleService.getPermissionRoleWithPagination(
      user,
      args
    );
  }

  @Mutation(() => String)
  async addRole(
    @UserEntity() user: User,
    @Args('name') name: string
  ): Promise<String> {
    await this.permissionRoleService.createRole(user, name);
    return `Added role.`;
  }

  @Mutation(() => String)
  async editRole(
    @Args('id') id: number,
    @Args('name') name: string
  ): Promise<String> {
    await this.permissionRoleService.editRole(id, name);
    return `Role updated.`;
  }

  @Mutation(() => String)
  async removeRole(@Args('id') id: number): Promise<String> {
    await this.permissionRoleService.deleteRole(id);
    return `Role deleted.`;
  }

  @Mutation(() => String)
  async assignPermission(
    @UserEntity() user: User,
    @Args('roleId') roleId: number,
    @Args('permissions', { type: () => [PermissionEnum] })
    permissions: number[]
  ): Promise<String> {
    await this.permissionRoleService.assignPermission(
      user,
      roleId,
      permissions
    );
    return `Assigned permission.`;
  }

  @Query(() => [RoleModel])
  async getRoles(): Promise<RoleModel[]> {
    const roles: any = await this.prisma.role.findMany({
      orderBy: { id: 'asc' },
    });
    return roles;
  }
}
