import { BadRequestException, Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from './../prisma/prisma.service';
import { APSService } from './aps.service';
import { UserService } from './user.service';
import { RedisCacheService } from 'src/redisCache.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly apsService: APSService,
    private readonly userService: UserService,
    private readonly redisCacheService: RedisCacheService
  ) {}

  async validateUser(uuid: string): Promise<User> {
    // First check cache
    let user = await this.redisCacheService.get(`user-uuid-${uuid}`);
    if (!user) {
      // If not in cache, call database
      user = await this.prisma.user.findUnique({ where: { userId: uuid } });
      if (!user) {
        // If user not found in cmms system database, call APS
        const profile = await this.apsService.getProfile(uuid);
        // Create new user based on APS response
        user = await this.userService.createUser(
          profile.rcno,
          profile.userId,
          profile.fullName,
          profile.email
        );
        if (!user) {
          throw new BadRequestException('Invalid user.');
        }
      }
      await this.redisCacheService.setForMonth(`user-uuid-${uuid}`, user);
    }
    return user;
  }
}
