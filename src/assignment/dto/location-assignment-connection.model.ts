import { ObjectType } from '@nestjs/graphql';
import { LocationAssign } from 'src/location/entities/location-assign.entity';
import RelayTypes from '../../common/pagination/relay-types';

@ObjectType()
export class PaginatedLocationAssignment extends RelayTypes<LocationAssign>(
  LocationAssign
) {}
