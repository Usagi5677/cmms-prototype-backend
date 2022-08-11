import { ObjectType } from '@nestjs/graphql';

@ObjectType({ isAbstract: true })
export class PermissionWithDescription {
  name: string;
  type: string;
  description: string;
}
