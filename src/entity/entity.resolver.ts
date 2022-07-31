import { Resolver, Query, Args } from '@nestjs/graphql';
import { EntityService } from './entity.service';
import { Entity } from './entities/entity.entity';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from 'src/guards/gql-auth.guard';

@UseGuards(GqlAuthGuard)
@Resolver(() => Entity)
export class EntityResolver {
  constructor(private readonly entityService: EntityService) {}

  @Query(() => [Entity], { name: 'searchEntity' })
  search(
    @Args('query') query: string,
    @Args('limit', { nullable: true }) limit: number
  ) {
    return this.entityService.search(query, limit);
  }
}
