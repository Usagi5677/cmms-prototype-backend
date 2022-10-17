/* eslint-disable @typescript-eslint/ban-types */
import { InternalServerErrorException, UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UserEntity } from '../../decorators/user.decorator';
import { GqlAuthGuard } from '../../guards/gql-auth.guard';
import { User } from '../../models/user.model';
import { PrismaService } from 'nestjs-prisma';
import { UsersConnectionArgs } from '../../models/args/user-connection.args';
import { PaginatedUsers } from '../../models/pagination/user-connection.model';
import { UserService } from 'src/services/user.service';
import { Profile } from 'src/models/profile.model';
import { APSService } from 'src/services/aps.service';
import { UserWithRoles } from 'src/models/user-with-roles.model';
import { Permissions } from 'src/decorators/permissions.decorator';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { RedisCacheService } from 'src/redisCache.service';

@Resolver(() => User)
@UseGuards(GqlAuthGuard, PermissionsGuard)
export class UserResolver {
  constructor(
    private prisma: PrismaService,
    private userService: UserService,
    private apsService: APSService,
    private redisCacheService: RedisCacheService
  ) {}

  @Query(() => UserWithRoles)
  async me(@UserEntity() user: User): Promise<User> {
    const userDB = await this.prisma.user.findFirst({
      where: { id: user.id },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissionRoles: true,
              },
            },
          },
        },
        entityAssignment: {
          where: { removedAt: null },
          include: {
            entity: {
              include: {
                type: true,
              },
            },
          },
        },
        divisionUsers: {
          where: { removedAt: null },
        },
        location: true,
      },
    });
    return userDB;
  }

  @Query(() => Profile)
  async profile(@UserEntity() user: User): Promise<Profile> {
    return this.apsService.getProfile(user.userId);
  }

  @Query(() => [User])
  async appUsers(): Promise<User[]> {
    const users: any = await this.prisma.user.findMany({
      orderBy: { rcno: 'asc' },
    });
    return users;
  }

  /** Search APS users. */
  @Query(() => [User])
  async searchAPSUsers(@Args('query') query: string): Promise<User[]> {
    return await this.apsService.searchAPS(query);
  }

  @Query(() => PaginatedUsers)
  async getAllUsers(
    @UserEntity() user: User,
    @Args() args: UsersConnectionArgs
  ): Promise<PaginatedUsers> {
    return await this.userService.getUserWithPagination(user, args);
  }

  /** Add app user with roles. If user does not exist in db, fetches from APS. */
  @Permissions('ADD_USER_WITH_ROLE')
  @Mutation(() => String)
  async addAppUser(
    @Args('userId') userId: string,
    @Args('roles', { type: () => [Number] }) roles: number[]
  ): Promise<string> {
    await this.userService.addAppUser(userId, roles);
    return 'App user added.';
  }

  /** Remove role from user. */
  @Permissions('EDIT_USER_ROLE')
  @Mutation(() => String)
  async removeUserRole(
    @UserEntity() user: User,
    @Args('userId') targetUserId: number,
    @Args('roleId') roleId: number
  ): Promise<string> {
    await this.prisma.userRole.deleteMany({
      where: { userId: targetUserId, roleId },
    });
    await this.redisCacheService.delPattern(`roles-${targetUserId}`);
    return 'User role removed.';
  }

  /** Add user role. */
  @Permissions('EDIT_USER_ROLE')
  @Mutation(() => String)
  async addUserRole(
    @Args('userId') targetUserId: number,
    @Args('roles', { type: () => [Number] }) roles: number[]
  ): Promise<String> {
    try {
      await this.prisma.userRole.deleteMany({
        where: { userId: targetUserId },
      });
      await this.prisma.userRole.createMany({
        data: roles.map((roleId) => ({
          userId: targetUserId,
          roleId,
        })),
      });

      await this.redisCacheService.delPattern(`roles-${targetUserId}`);
      return 'User role added.';
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  /** find users with permission. */
  @Query(() => [User])
  async getUsersWithPermission(
    @Args('permissions', { type: () => [String] }) permissions: string[],
    @Args('search', { nullable: true }) search: string
  ): Promise<User[]> {
    try {
      //get all role ids which have permission
      const roleIDs = await this.prisma.permissionRole.findMany({
        where: {
          permission: { in: permissions },
        },
        select: {
          roleId: true,
        },
      });
      //clean it up
      const cleanRoleIDs = roleIDs.map((roleID) => roleID.roleId);
      //get all users which have that role id
      const userIds = await this.prisma.userRole.findMany({
        where: {
          roleId: { in: cleanRoleIDs },
        },
        select: {
          userId: true,
        },
      });

      //clean it up
      const cleanUserIds = userIds.map((userId) => userId.userId);
      //unique users only
      const uniqueUserIds = [...new Set(cleanUserIds)];

      let where: any = {
        AND: [
          {
            id: { in: uniqueUserIds },
          },
        ],
      };

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

      //find unique users
      const users = await this.prisma.user.findMany({
        where,
      });
      return users;
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  /**Edit user location. */
  @Permissions('EDIT_USER_LOCATION')
  @Mutation(() => String)
  async editUserLocation(
    @UserEntity() user: User,
    @Args('id') id: number,
    @Args('locationId', { nullable: true }) locationId: number
  ): Promise<String> {
    try {
      await this.userService.editUserLocation(user, id, locationId);
      return 'User location updated.';
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }
}
