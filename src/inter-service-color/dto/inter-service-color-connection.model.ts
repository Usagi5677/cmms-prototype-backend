import { ObjectType } from '@nestjs/graphql';
import RelayTypes from '../../common/pagination/relay-types';
import { InterServiceColor } from '../entities/inter-service-color.entity';

@ObjectType()
export class PaginatedInterServiceColor extends RelayTypes<InterServiceColor>(
  InterServiceColor
) {}
