/* eslint-disable @typescript-eslint/ban-types */
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '../../guards/gql-auth.guard';
import { UserEntity } from 'src/decorators/user.decorator';
import { User } from 'src/models/user.model';
import { PrismaService } from 'nestjs-prisma';
import { PermissionRole } from 'src/models/permission-role.model';
import { PermissionRoleService } from 'src/services/permissionRole.service';
import { PaginatedPermissionRole } from 'src/models/pagination/permission-role-connection.model';
import { PermissionRoleConnectionArgs } from 'src/models/args/permission-role-connection.args';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { Roles as RoleModel } from 'src/models/roles.model';
import { Permissions } from 'src/decorators/permissions.decorator';

@UseGuards(GqlAuthGuard, PermissionsGuard)
@Resolver(() => PermissionRole)
export class PermissionRoleResolver {
  constructor(
    private permissionRoleService: PermissionRoleService,
    private prisma: PrismaService
  ) {}

  @Permissions('VIEW_ROLES')
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

  @Permissions('ADD_ROLE')
  @Mutation(() => String)
  async addRole(
    @UserEntity() user: User,
    @Args('name') name: string
  ): Promise<String> {
    await this.permissionRoleService.createRole(user, name);
    return `Added role.`;
  }

  @Permissions('EDIT_ROLE')
  @Mutation(() => String)
  async editRole(
    @Args('id') id: number,
    @Args('name') name: string
  ): Promise<String> {
    await this.permissionRoleService.editRole(id, name);
    return `Role updated.`;
  }

  @Permissions('DELETE_ROLE')
  @Mutation(() => String)
  async removeRole(@Args('id') id: number): Promise<String> {
    await this.permissionRoleService.deleteRole(id);
    return `Role deleted.`;
  }

  @Permissions('ASSIGN_PERMISSION')
  @Mutation(() => String)
  async assignPermission(
    @Args('roleId') roleId: number,
    @Args('permissions', { type: () => [String] }) permissions: string[]
  ): Promise<String> {
    await this.permissionRoleService.assignPermission(roleId, permissions);
    return `Assigned permission.`;
  }

  @Permissions('VIEW_ROLES')
  @Query(() => [RoleModel])
  async getRoles(): Promise<RoleModel[]> {
    const roles: any = await this.prisma.role.findMany({
      orderBy: { id: 'asc' },
    });
    return roles;
  }

  @Permissions('VIEW_ROLES')
  @Query(() => RoleModel)
  async getRoleWithPermission(@Args('roleId') roleId: number) {
    return await this.permissionRoleService.getRoleWithPermission(roleId);
  }

  @Permissions('ASSIGN_PERMISSION')
  @Mutation(() => String)
  async togglePermission(
    @Args('roleId') roleId: number,
    @Args('permission') permission: string,
    @Args('complete') complete: boolean
  ): Promise<String> {
    await this.permissionRoleService.togglePermission(
      roleId,
      permission,
      complete
    );
    return `Permission updated to role.`;
  }
}
