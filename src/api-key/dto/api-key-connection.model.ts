import { ObjectType } from '@nestjs/graphql';
import RelayTypes from '../../common/pagination/relay-types';
import { ApiKey } from '../entities/api-key.model';

@ObjectType()
export class PaginatedApiKey extends RelayTypes<ApiKey>(ApiKey) {}
