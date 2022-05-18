import { PrismaService } from 'nestjs-prisma';
import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { RedisCacheService } from 'src/redisCache.service';
import {
  connectionFromArraySlice,
  getPagingParameters,
} from 'src/common/pagination/connection-args';
import { UserService } from './user.service';
import { NotificationService } from './notification.service';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { PUB_SUB } from 'src/resolvers/pubsub/pubsub.module';
import { ConfigService } from '@nestjs/config';
import { PermissionRoleConnectionArgs } from 'src/models/args/permission-role-connection.args';
import { PaginatedPermissionRole } from 'src/models/pagination/permission-role-connection.model';
import { PermissionRole } from 'src/models/permission-role.model';
import { PermissionEnum } from 'src/common/enums/permission';

@Injectable()
export class PermissionRoleService {
  constructor(
    private prisma: PrismaService,
    private userService: UserService,
    private readonly redisCacheService: RedisCacheService,
    private readonly notificationService: NotificationService,
    @Inject(PUB_SUB) private readonly pubSub: RedisPubSub,
    private configService: ConfigService
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
      // If search contains all numbers, search the machine ids as well
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
  }

  //** assign permission. */
  async assignPermission(
    user: User,
    roleId: number,
    permissions: PermissionEnum[]
  ) {
    try {
      await this.prisma.permissionRole.deleteMany({
        where: { roleId },
      });
      await this.prisma.permissionRole.createMany({
        data: permissions.map((permission) => ({
          roleId,
          permission,
        })),
      });
      await this.redisCacheService.del(`permissions-${user.id}`);
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }
}
