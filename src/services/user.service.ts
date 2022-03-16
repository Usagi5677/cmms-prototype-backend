import { PrismaService } from 'nestjs-prisma';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { User, Role, Prisma } from '@prisma/client';
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
}
