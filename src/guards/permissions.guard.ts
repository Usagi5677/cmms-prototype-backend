import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Permission } from '@prisma/client';
import { UserService } from 'src/services/user.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly userService: UserService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permissions = this.reflector.getAllAndOverride<Permission[]>(
      'permissions',
      [context.getHandler(), context.getClass()]
    );
    if (!permissions) {
      return true;
    }
    const user = GqlExecutionContext.create(context).getContext().req.user;
    const userRolesPermissions =
      await this.userService.getUserRolesPermissionsList(1);
    return permissions.some((p) => userRolesPermissions.includes(p));
  }
}
