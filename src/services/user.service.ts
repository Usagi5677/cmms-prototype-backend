import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';

import { RedisCacheService } from 'src/redisCache.service';
//import { UserGroupConnectionArgs } from 'src/models/args/user-group-connection.args';
import {
  connectionFromArraySlice,
  getPagingParameters,
} from 'src/common/pagination/connection-args';
import { APSService } from './aps.service';
import { UsersConnectionArgs } from 'src/models/args/user-connection.args';
import { PaginatedUsers } from 'src/models/pagination/user-connection.model';
import { User } from 'src/models/user.model';
import { PrismaService } from 'src/prisma/prisma.service';
import { userTypeCount } from 'src/entity/dto/models/userTypeCount.model';
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
    try {
      if (!roles) roles = [];
      return await this.prisma.user.create({
        data: {
          rcno,
          userId,
          fullName,
          email,
        },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Get permissions of user roles. First checks cache. If not in cache, gets from db and adds to cache */
  async getUserRolesPermissionsList(id: number): Promise<string[]> {
    try {
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
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  // Check if user has the input permission. If not, throw Forbidden exception.
  async checkUserPermission(
    userId: number,
    permission: string,
    returnFalse = false
  ) {
    try {
      const userPermissions = await this.getUserRolesPermissionsList(userId);
      if (!userPermissions.includes(permission)) {
        if (returnFalse) return false;
        throw new ForbiddenException(
          'You do not have access to this resource.'
        );
      }
      return true;
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Get roles of user. First checks cache. If not in cache, gets from db and adds to cache */
  async getUserRolesList(id: number): Promise<number[]> {
    try {
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
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async addAppUser(userId: string, roles: number[]) {
    try {
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
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Get user. Results are paginated. User cursor argument to go forward/backward. */
  async getUserWithPagination(
    user: User,
    args: UsersConnectionArgs
  ): Promise<PaginatedUsers> {
    try {
      const { limit, offset } = getPagingParameters(args);
      const limitPlusOne = limit + 1;
      const { search, locationIds, divisionIds, type } = args;

      // eslint-disable-next-line prefer-const
      let where: any = { AND: [] };
      //for now these only
      if (search) {
        const or: any = [
          { fullName: { contains: search, mode: 'insensitive' } },
        ];
        // If search contains all numbers, search the rcno as well
        if (/^(0|[1-9]\d*)$/.test(search)) {
          or.push({ rcno: parseInt(search) });
        }
        where.AND.push({
          OR: or,
        });
      }
      if (locationIds) {
        where.AND.push({
          userAssignment: {
            some: {
              locationId: {
                in: locationIds,
              },
              type,
              active: true,
            },
          },
        });
      }
      if (divisionIds) {
        where.AND.push({
          divisionUsers: {
            some: {
              divisionId: { in: divisionIds },
              user: {
                userAssignment: {
                  some: { locationId: { in: locationIds }, type, active: true },
                },
              },
            },
          },
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
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async getUserTypeCount(): Promise<userTypeCount> {
    try {
      const key = `userTypeCount`;
      let userTypeCount = await this.redisCacheService.get(key);
      if (!userTypeCount) {
        const entities = await this.prisma.entity.findMany({
          where: { deletedAt: null },
          select: { assignees: true },
        });
        let admin = 0;
        let engineer = 0;
        let technician = 0;
        let user = 0;
        entities.map((e) => {
          e?.assignees?.map((u) => {
            if (u.type === 'Admin') {
              admin += 1;
            } else if (u.type === 'Engineer') {
              engineer += 1;
            } else if (u.type === 'Technician') {
              technician += 1;
            } else if (u.type === 'User') {
              user += 1;
            }
          });
        });
        const total = await this.prisma.user.count();
        userTypeCount = {
          admin,
          engineer,
          technician,
          user,
          total,
        };
        await this.redisCacheService.setForHour(key, userTypeCount);
        return userTypeCount;
      }
      return userTypeCount;
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }
}
