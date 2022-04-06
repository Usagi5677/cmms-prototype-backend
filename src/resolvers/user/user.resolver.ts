import { ExecutionContext, UseGuards } from '@nestjs/common';
import {
  Args,
  GqlExecutionContext,
  Mutation,
  Query,
  Resolver,
} from '@nestjs/graphql';
import { UserEntity } from '../../decorators/user.decorator';
import { GqlAuthGuard } from '../../guards/gql-auth.guard';
import { User } from '../../models/user.model';
import { PrismaService } from 'nestjs-prisma';
import { UsersConnectionArgs } from '../../models/args/user-connection.args';
import { PaginatedUsers } from '../../models/pagination/user-connection.model';
import {
  connectionFromArraySlice,
  getPagingParameters,
} from '../../common/pagination/connection-args';
import { Roles } from 'src/decorators/roles.decorator';
import { RolesGuard } from 'src/guards/roles.guard';
import { UserService } from 'src/services/user.service';
import { Profile } from 'src/models/profile.model';
import { APSService } from 'src/services/aps.service';
import { UserWithRoles } from 'src/models/user-with-roles.model';
import { Role } from '@prisma/client';
import { RedisCacheService } from 'src/redisCache.service';
import { RoleEnum } from 'src/common/enums/roles';
import { Permissions } from 'src/decorators/permissions.decorator';
import { PermissionsGuard } from 'src/guards/permissions.guard';

@Resolver(() => User)
@UseGuards(GqlAuthGuard, PermissionsGuard)
export class UserResolver {
  constructor(
    private prisma: PrismaService,
    private userService: UserService,
    private apsService: APSService,
    private redisCacheService: RedisCacheService
  ) {}

  @Permissions('AddMachine')
  @Query(() => String)
  sayHello(): string {
    return 'Hello World!';
  }

  @Query(() => UserWithRoles)
  async me(@UserEntity() user: User): Promise<User> {
    return user;
  }

  @Query(() => Profile)
  async profile(@UserEntity() user: User): Promise<Profile> {
    return this.apsService.getProfile(user.userId);
  }

  @Roles('Admin')
  @Query(() => [User])
  async appUsers(): Promise<User[]> {
    const users: any = await this.prisma.user.findMany({
      orderBy: { rcno: 'asc' },
    });
    return users;
  }
}
