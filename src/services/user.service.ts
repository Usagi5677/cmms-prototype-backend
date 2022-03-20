import { PrismaService } from 'nestjs-prisma';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { User, Role, Prisma, Permission } from '@prisma/client';
import { RedisCacheService } from 'src/redisCache.service';
//import { UserGroupConnectionArgs } from 'src/models/args/user-group-connection.args';
import {
  connectionFromArraySlice,
  getPagingParameters,
} from 'src/common/pagination/connection-args';
import { APSService } from './aps.service';
import { RoleEnum } from 'src/common/enums/roles';
import { Profile } from 'src/models/profile.model';
@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private readonly redisCacheService: RedisCacheService,
    private readonly apsService: APSService
  ) {}

  //** Create user. Only to be called by the system, not a user. */
  async createUser(
    rcno: number,
    userId: string,
    fullName: string,
    email: string,
    roles?: RoleEnum[]
  ): Promise<User> {
    if (!roles) roles = [];
    return await this.prisma.user.create({
      data: {
        rcno,
        userId,
        fullName,
        email,
        roles: { create: roles.map((role) => ({ role })) },
      },
    });
  }

  //** Get permissions of user roles. First checks cache. If not in cache, gets from db and adds to cache */
  async getUserRolesPermissionsList(id: number): Promise<Permission[]> {
    let permissions = await this.redisCacheService.get(`permissions-${id}`);
    console.log('permissions');
    console.log(permissions);
    if (!permissions) {
      const userRoles = await this.prisma.userRole.findMany({
        where: { userId: id },
      });
      const rolesPermissions = await this.prisma.permissionRole.findMany({
        where: { roleId: { in: userRoles.map((r) => r.roleId) } },
      });
      console.log(rolesPermissions);
      permissions = rolesPermissions.map((r) => r.permission);
      await this.redisCacheService.setForMonth(
        `permissions-${id}`,
        permissions
      );
    }
    return permissions;
  }

  //** Get roles of user. First checks cache. If not in cache, gets from db and adds to cache */
  async getUserRolesList(id: number): Promise<Role[]> {
    let roles = await this.redisCacheService.get(`roles-${id}`);
    if (!roles) {
      const userRoles = await this.prisma.userRole.findMany({
        where: { userId: id },
      });
      roles = userRoles.map((r) => r.roleId);
      await this.redisCacheService.setForMonth(`roles-${id}`, roles);
    }
    return roles;
  }
}
