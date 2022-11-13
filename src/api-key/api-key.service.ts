import { BadRequestException, Injectable } from '@nestjs/common';
import { RedisCacheService } from 'src/redisCache.service';
import { ApiKey } from './entities/api-key.model';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { CreateApiKeyInput } from './dto/create-api-key.input';
import { PERMISSIONS } from 'src/constants';
import { User } from 'src/models/user.model';
import { ApiKeyConnectionArgs } from './dto/api-key-connection.args';
import { PaginatedApiKey } from './dto/api-key-connection.model';
import {
  connectionFromArraySlice,
  getPagingParameters,
} from 'src/common/pagination/connection-args';
import { EditApiKeyInput } from './dto/edit-api-key.input';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ApiKeyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisCacheService: RedisCacheService
  ) {}

  keyGen(): [string, string] {
    const key = crypto.randomBytes(24).toString('hex');
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(key, salt);
    return [key, hash];
  }

  keyMatches(inputKey, hash): boolean {
    return bcrypt.compareSync(inputKey, hash);
  }

  async create(
    user: User,
    { name, permissions, expiresAt }: CreateApiKeyInput
  ): Promise<string> {
    if (!name) {
      throw new BadRequestException('Key name is required.');
    }
    if (permissions.length === 0) {
      throw new BadRequestException('At lease one permission is required.');
    }
    const validPermissions = permissions.every((p) => PERMISSIONS.includes(p));
    if (!validPermissions) {
      throw new BadRequestException('Invalid permissions.');
    }
    const [key, hash] = this.keyGen();
    await this.prisma.apiKey.create({
      data: {
        name,
        apiKeyStart: key.substring(0, 8),
        hash,
        createdById: user.id,
        permissions: { create: permissions.map((p) => ({ permission: p })) },
        expiresAt,
      },
    });
    return key;
  }

  async findAll(input: ApiKeyConnectionArgs): Promise<PaginatedApiKey> {
    const { limit, offset } = getPagingParameters(input);
    const limitPlusOne = limit + 1;
    const { search } = input;
    const where: any = {
      OR: [
        { name: { contains: search ?? '', mode: 'insensitive' } },
        { apiKeyStart: { contains: search ?? '', mode: 'insensitive' } },
      ],
    };
    const results = await this.prisma.apiKey.findMany({
      skip: offset,
      take: limitPlusOne,
      where,
      orderBy: { createdAt: 'asc' },
      include: { permissions: true },
    });
    const count = await this.prisma.apiKey.count({ where });
    const { edges, pageInfo } = connectionFromArraySlice(
      results.slice(0, limit),
      input,
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

  async findOne(inputKey: string): Promise<ApiKey> {
    const redisKey = `apiKey-${inputKey}`;
    let key = await this.redisCacheService.get(redisKey);
    if (key) return key;
    const matches = await this.prisma.apiKey.findMany({
      where: { apiKeyStart: inputKey.substring(0, 8) },
    });
    if (matches.length === 0) {
      throw new BadRequestException('Key not found.');
    }
    for (const match of matches) {
      if (this.keyMatches(inputKey, match.hash)) {
        await this.redisCacheService.setForDay(redisKey, match);
        return match;
      }
    }
  }

  async callCountIncrease(key: ApiKey) {
    await this.prisma.apiKey.update({
      where: { id: key.id },
      data: { calls: { increment: 1 } },
    });
  }

  async keyPermissions(key: ApiKey): Promise<string[]> {
    const redisKey = `keyPermissionsStrings-${key.id}`;
    let keyPermissionStrings = await this.redisCacheService.get(redisKey);
    if (!keyPermissionStrings) {
      const keyPermissions = await this.prisma.apiKeyPermission.findMany({
        where: { apiKeyId: key.id },
      });
      keyPermissionStrings = keyPermissions.map((kp) => kp.permission);
      await this.redisCacheService.setForDay(redisKey, keyPermissionStrings);
    }
    return keyPermissionStrings;
  }

  async hasPermissions(key: ApiKey, permissions: string[]) {
    const keyPermissions = await this.keyPermissions(key);
    return permissions.every((p) => keyPermissions.includes(p));
  }

  async editKey({ keyId, name, permissions }: EditApiKeyInput) {
    const invalidPermissions = permissions.filter(
      (p) => !PERMISSIONS.includes(p)
    );
    if (invalidPermissions.length > 0) {
      throw new BadRequestException(
        `Invalid permissions: ${invalidPermissions.join(', ')}`
      );
    }
    const key = await this.prisma.apiKey.findFirst({ where: { id: keyId } });
    if (!key) {
      throw new BadRequestException('Invalid key.');
    }
    await this.prisma.$transaction([
      this.prisma.apiKey.update({ where: { id: keyId }, data: { name } }),
      this.prisma.apiKeyPermission.deleteMany({ where: { apiKeyId: keyId } }),
      this.prisma.apiKeyPermission.createMany({
        data: permissions.map((p) => ({ apiKeyId: keyId, permission: p })),
      }),
    ]);
    await this.redisCacheService.delPattern(`apiKey-${key.apiKeyStart}*`);
    await this.redisCacheService.delPattern(`keyPermissionsStrings-${key.id}`);
  }

  async deactivate(keyId: number) {
    const key = await this.prisma.apiKey.update({
      where: { id: keyId },
      data: { active: false },
    });
    const redisKey = `apiKey-${key.apiKeyStart}*`;
    await this.redisCacheService.delPattern(redisKey);
  }
}
