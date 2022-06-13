import { PrismaService } from 'nestjs-prisma';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { User, Prisma } from '@prisma/client';
import { RedisCacheService } from 'src/redisCache.service';
//import { UserGroupConnectionArgs } from 'src/models/args/user-group-connection.args';
import {
  connectionFromArraySlice,
  getPagingParameters,
} from 'src/common/pagination/connection-args';
import { APSService } from './aps.service';
import { RoleEnum } from 'src/common/enums/roles';
import { Profile } from 'src/models/profile.model';
import { Roles } from 'src/models/roles.model';
import { UsersConnectionArgs } from 'src/models/args/user-connection.args';
import { PaginatedUsers } from 'src/models/pagination/user-connection.model';
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
    roles?: number[]
  ): Promise<User> {
    if (!roles) roles = [];
    return await this.prisma.user.create({
      data: {
        rcno,
        userId,
        fullName,
        email,
      },
    });
  }

  //** Get permissions of user roles. First checks cache. If not in cache, gets from db and adds to cache */
  async getUserRolesPermissionsList(id: number): Promise<string[]> {
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
      //permissions = await this.prisma.permission.findMany({
      //  where: { id: { in: rolesPermissions.map((r) => r.permissionId) } },
      //});
      permissions = rolesPermissions.map((p) => p.permission);
      await this.redisCacheService.setForMonth(
        `permissions-${id}`,
        permissions
      );
    }
    return permissions;
  }

  //** Get roles of user. First checks cache. If not in cache, gets from db and adds to cache */
  async getUserRolesList(id: number): Promise<Roles[]> {
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

  async addAppUser(userId: string, roles: number[]) {
    const user = await this.prisma.user.findFirst({
      where: { userId },
      include: { roles: true },
    });

    // If user doesn't exist on the system, fetch from APS, then create user with roles.
    if (!user) {
      const profile = await this.apsService.getProfile(userId);
      if (!profile) {
        throw new BadRequestException('Invalid user.');
      }
      const newUser = await this.createUser(
        profile.rcno,
        profile.userId,
        profile.fullName,
        profile.email
      );
      await this.prisma.userRole.createMany({
        data: roles.map((roleId) => ({ userId: newUser.id, roleId })),
      });

      return;
    }

    // If user does exist, remove existing roles and add new roles.
    await this.prisma.userRole.deleteMany({ where: { userId: user.id } });
    await this.prisma.userRole.createMany({
      data: roles.map((role) => ({ userId: user.id, roleId: role })),
    });
    await this.redisCacheService.del(`user-uuid-${userId}`);
    await this.redisCacheService.del(`roles-${user.id}`);
  }

  //** Get user. Results are paginated. User cursor argument to go forward/backward. */
  async getUserWithPagination(
    user: User,
    args: UsersConnectionArgs
  ): Promise<PaginatedUsers> {
    const { limit, offset } = getPagingParameters(args);
    const limitPlusOne = limit + 1;
    const { search } = args;

    // eslint-disable-next-line prefer-const
    let where: any = { AND: [] };
    //for now these only
    if (search) {
      const or: any = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { rcno: { contains: search, mode: 'insensitive' } },
      ];
      // If search contains all numbers, search the machine ids as well
      if (/^(0|[1-9]\d*)$/.test(search)) {
        or.push({ id: parseInt(search) });
      }
      where.AND.push({
        OR: or,
      });
    }
    const users = await this.prisma.user.findMany({
      skip: offset,
      take: limitPlusOne,
      where,
      orderBy: { id: 'desc' },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });
    const count = await this.prisma.user.count({ where });
    const { edges, pageInfo } = connectionFromArraySlice(
      users.slice(0, limit),
      args,
      {
        arrayLength: count,
        sliceStart: offset,
      }
    );
    return {
      edges,
      pageInfo: {
        ...pageInfo,
        count,
        hasNextPage: offset + limit < count,
        hasPreviousPage: offset >= limit,
      },
    };
  }
}
