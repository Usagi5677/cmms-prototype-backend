import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { PrismaService } from './../prisma/prisma.service';
import { SecurityConfig } from '../configs/config.interface';
import { Token } from '../models/token.model';
import { APSService } from './aps.service';
import { UserService } from './user.service';
import { RedisCacheService } from 'src/redisCache.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly APSService: APSService,
    private readonly userService: UserService,
    private readonly redisCacheService: RedisCacheService
  ) {}

  async validateUser(uuid: string): Promise<User> {
    // First check cache
    let user = await this.redisCacheService.get(`user-uuid-${uuid}`);
    console.log(user);
    if (!user) {
      // If not in cache, call database
      user = await this.prisma.user.findUnique({ where: { userId: uuid } });
      if (!user) {
        // If user not found in helpdesk system database, call APS
        const profile = await this.APSService.getProfile(uuid);
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
