import { Field, ObjectType } from '@nestjs/graphql';
import { ApiKey } from './api-key.model';

@ObjectType()
export class ApiKeyPermission {
  id: number;
  apiKey: ApiKey;

  @Field()
  permission: string;
}
