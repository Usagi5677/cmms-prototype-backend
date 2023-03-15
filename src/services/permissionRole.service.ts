import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { RedisCacheService } from 'src/redisCache.service';
import {
  connectionFromArraySlice,
  getPagingParameters,
} from 'src/common/pagination/connection-args';
import { PermissionRoleConnectionArgs } from 'src/models/args/permission-role-connection.args';
import { PaginatedPermissionRole } from 'src/models/pagination/permission-role-connection.model';
import { PERMISSIONS } from 'src/constants';
import { User } from 'src/models/user.model';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PermissionRoleService {
  constructor(
    private prisma: PrismaService,
    private readonly redisCacheService: RedisCacheService
  ) {}

  //** Create role. */
  async createRole(user: User, name: string) {
    try {
      await this.prisma.role.create({
        data: { name, createdById: user.id },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Edit role. */
  async editRole(id: number, name: string) {
    try {
      await this.prisma.role.update({
        where: { id },
        data: { name },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Delete role. */
  async deleteRole(id: number) {
    try {
      await this.prisma.role.delete({
        where: { id },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Get roles. Results are paginated. User cursor argument to go forward/backward. */
  async getPermissionRoleWithPagination(
    user: User,
    args: PermissionRoleConnectionArgs
  ): Promise<PaginatedPermissionRole> {
    try {
      const { limit, offset } = getPagingParameters(args);
      const limitPlusOne = limit + 1;
      const { createdById, search } = args;

      // eslint-disable-next-line prefer-const
      let where: any = { AND: [] };
      if (createdById) {
        where.AND.push({ createdById });
      }
      //for now these only
      if (search) {
        const or: any = [{ name: { contains: search, mode: 'insensitive' } }];
        // If search contains all numbers, search ids as well
        if (/^(0|[1-9]\d*)$/.test(search)) {
          or.push({ id: parseInt(search) });
        }
        where.AND.push({
          OR: or,
        });
      }
      const permissionRoles = await this.prisma.role.findMany({
        skip: offset,
        take: limitPlusOne,
        where,
        include: {
          permissionRoles: true,
          createdBy: true,
          userRoles: true,
        },
      });
      const count = await this.prisma.role.count({ where });
      const { edges, pageInfo } = connectionFromArraySlice(
        permissionRoles.slice(0, limit),
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

  //** assign permission. */
  async assignPermission(roleId: number, permissions: string[]) {
    for (const permission of permissions) {
      if (!PERMISSIONS.includes(permission)) {
        throw new BadRequestException(`Invalid permission: ${permission}`);
      }
    }

    try {
      await this.prisma.permissionRole.createMany({
        data: permissions.map((permission) => ({
          roleId,
          permission: permission,
        })),
      });
      await this.redisCacheService.del(`permissions-${roleId}`);
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async getRoleWithPermission(roleId: number) {
    try {
      return await this.prisma.role.findFirst({
        where: {
          id: roleId,
        },
        include: {
          permissionRoles: true,
          createdBy: true,
        },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpeected error occured');
    }
  }

  async togglePermission(
    roleId: number,
    permission: string,
    complete: boolean
  ) {
    try {
      if (complete) {
        await this.prisma.permissionRole.create({
          data: {
            roleId,
            permission,
          },
        });
        await this.redisCacheService.del(`permissions-${roleId}`);
      } else {
        await this.prisma.permissionRole.deleteMany({
          where: {
            roleId: roleId,
            permission: permission,
          },
        });
        await this.redisCacheService.del(`permissions-${roleId}`);
      }
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpeected error occured');
    }
  }
}
