import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { ApiKeyService } from './api-key.service';
import { CreateApiKeyInput } from './dto/create-api-key.input';
import { ApiKey } from './entities/api-key.model';
import { Permissions } from '../decorators/permissions.decorator';
import { GqlAuthGuard } from 'src/guards/gql-auth.guard';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { UserEntity } from 'src/decorators/user.decorator';
import { User } from 'src/models/user.model';
import { PaginatedApiKey } from './dto/api-key-connection.model';
import { ApiKeyConnectionArgs } from './dto/api-key-connection.args';
import { EditApiKeyInput } from './dto/edit-api-key.input';

@UseGuards(GqlAuthGuard, PermissionsGuard)
@Permissions('MODIFY_KEYS')
@Resolver(() => ApiKey)
export class ApiKeyResolver {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @Mutation(() => String)
  async createApiKey(
    @UserEntity() user: User,
    @Args('input') input: CreateApiKeyInput
  ) {
    return await this.apiKeyService.create(user, input);
  }

  @Permissions('VIEW_KEYS')
  @Query(() => PaginatedApiKey)
  async apiKeys(@Args() input: ApiKeyConnectionArgs) {
    return await this.apiKeyService.findAll(input);
  }

  @Mutation(() => String)
  async editKey(@Args('input') input: EditApiKeyInput) {
    await this.apiKeyService.editKey(input);
    return 'Successfully added permissions to key.';
  }

  @Mutation(() => String)
  async deactivateApiKey(@Args('id') id: number) {
    await this.apiKeyService.deactivate(id);
    return 'Key deactivated.';
  }
}
