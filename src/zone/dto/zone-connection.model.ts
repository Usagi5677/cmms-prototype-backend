import { ObjectType } from '@nestjs/graphql';
import RelayTypes from '../../common/pagination/relay-types';
import { Zone } from '../entities/zone.entity';

@ObjectType()
export class PaginatedZone extends RelayTypes<Zone>(Zone) {}
