import { registerEnumType } from '@nestjs/graphql';

export enum RoleEnum {
  Admin = 'Admin',
  Agent = 'Agent',
}

registerEnumType(RoleEnum, {
  name: 'Role',
  description: 'All user roles.',
});
