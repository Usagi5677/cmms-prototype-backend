import { ObjectType } from '@nestjs/graphql';
import RelayTypes from '../../common/pagination/relay-types';
import { User } from '../user.model';

@ObjectType()
export class PaginatedUsers extends RelayTypes<User>(User) {}
