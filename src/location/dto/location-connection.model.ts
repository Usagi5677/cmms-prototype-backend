import { ObjectType } from '@nestjs/graphql';
import RelayTypes from '../../common/pagination/relay-types';
import { Location } from '../entities/location.entity';

@ObjectType()
export class PaginatedLocation extends RelayTypes<Location>(Location) {}
