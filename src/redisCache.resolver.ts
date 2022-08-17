import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { RedisCacheService } from './redisCache.service';
import { GqlAuthGuard } from './guards/gql-auth.guard';

@UseGuards(GqlAuthGuard)
@Resolver()
export class RedisCacheResolver {
  constructor(private readonly redisCacheService: RedisCacheService) {}

  @Query(() => [String], { name: 'redisKeys' })
  async getKeys(): Promise<string[]> {
    return await this.redisCacheService.getKeys();
  }

  @Query(() => String, { name: 'redisGet', nullable: true })
  async redisGet(
    @Args('key', { type: () => String }) key: string
  ): Promise<string> {
    const value = await this.redisCacheService.get(key);
    return JSON.stringify(value);
  }

  @Mutation(() => String, { name: 'flushRedis' })
  async flushRedis(): Promise<string> {
    await this.redisCacheService.deleteAll();
    return 'Redis cache flushed.';
  }
}
