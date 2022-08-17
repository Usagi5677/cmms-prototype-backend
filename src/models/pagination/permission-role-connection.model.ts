import { ObjectType } from '@nestjs/graphql';
import RelayTypes from '../../common/pagination/relay-types';
import { Roles } from '../roles.model';

@ObjectType()
export class PaginatedPermissionRole extends RelayTypes<Roles>(Roles) {}
