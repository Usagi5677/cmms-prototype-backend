import { PrismaService } from 'nestjs-prisma';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { RedisCacheService } from 'src/redisCache.service';
//import { UserGroupConnectionArgs } from 'src/models/args/user-group-connection.args';
import {
  connectionFromArraySlice,
  getPagingParameters,
} from 'src/common/pagination/connection-args';
import { APSService } from './aps.service';
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
    let permissions = [];
    // let permissions = await this.redisCacheService.get(`permissions-${id}`);
    const userRoleIds = await this.getUserRolesList(id);
    for (const roleId of userRoleIds) {
      const key = `permissions-${roleId}`;
      let rolePermissions: string[] = await this.redisCacheService.get(key);
      if (!rolePermissions) {
        const rp = await this.prisma.permissionRole.findMany({
          where: { roleId },
        });
        rolePermissions = rp.map((r) => r.permission);
        await this.redisCacheService.setForMonth(key, rolePermissions);
      }
      permissions = [...permissions, ...rolePermissions];
    }
    return permissions;
  }

  //** Get roles of user. First checks cache. If not in cache, gets from db and adds to cache */
  async getUserRolesList(id: number): Promise<number[]> {
    const key = `roles-${id}`;
    let roles = await this.redisCacheService.get(key);
    if (!roles) {
      const userRoles = await this.prisma.userRole.findMany({
        where: { userId: id },
      });
      roles = userRoles.map((r) => r.roleId);
      await this.redisCacheService.setForMonth(key, roles);
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
      const or: any = [{ fullName: { contains: search, mode: 'insensitive' } }];
      // If search contains all numbers, search the rcno as well
      if (/^(0|[1-9]\d*)$/.test(search)) {
        or.push({ rcno: parseInt(search) });
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

  //** Edit user location */
  async editUserLocation(user: User, id: number, location: string) {
    try {
      await this.prisma.user.update({
        where: { id },
        data: {
          location,
        },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }
}
