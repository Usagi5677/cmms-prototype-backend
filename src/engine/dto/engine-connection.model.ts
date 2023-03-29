import { ObjectType } from '@nestjs/graphql';
import RelayTypes from '../../common/pagination/relay-types';
import { Engine } from '../entities/engine.entity';

@ObjectType()
export class PaginatedEngine extends RelayTypes<Engine>(Engine) {}
