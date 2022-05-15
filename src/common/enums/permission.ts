import { registerEnumType } from '@nestjs/graphql';

export enum PermissionEnum {
  ADD_MACHINE = 'ADD_MACHINE',
  EDIT_MACHINE = 'EDIT_MACHINE',
  DELETE_MACHINE = 'DELETE_MACHINE',
  ADD_TRANSPORTATION = 'ADD_TRANSPORTATION',
  EDIT_TRANSPORTATION = 'EDIT_TRANSPORTATION',
  DELETE_TRANSPORTATION = 'DELETE_TRANSPORTATION',
}

registerEnumType(PermissionEnum, {
  name: 'Permission',
  description: 'All permissions.',
});
