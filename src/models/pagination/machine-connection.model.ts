import { ObjectType } from '@nestjs/graphql';
import RelayTypes from '../../common/pagination/relay-types';
import { Machine } from '../machine.model';

@ObjectType()
export class PaginatedMachine extends RelayTypes<Machine>(Machine) {}
