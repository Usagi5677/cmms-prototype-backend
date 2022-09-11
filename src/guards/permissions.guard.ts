import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ApiKeyService } from 'src/api-key/api-key.service';
import { UserService } from 'src/services/user.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly userService: UserService,
    private readonly apiKeyService: ApiKeyService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permissions = this.reflector.getAllAndOverride<string[]>(
      'permissions',
      [context.getHandler(), context.getClass()]
    );
    if (!permissions) {
      return true;
    }
    let requestorPermissions = [];
    const user = GqlExecutionContext.create(context).getContext().req?.user;
    if (user) {
      requestorPermissions = await this.userService.getUserRolesPermissionsList(
        user.id
      );
    } else {
      const request = context.switchToHttp().getRequest();
      const key = request.key;
      requestorPermissions = await this.apiKeyService.keyPermissions(key);
    }
    return permissions.some((p) => requestorPermissions.includes(p));
  }
}
