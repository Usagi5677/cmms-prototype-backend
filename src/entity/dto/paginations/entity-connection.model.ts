import { ObjectType } from '@nestjs/graphql';
import RelayTypes from '../../../common/pagination/relay-types';
import { EntityModel } from '../models/entityModel.model';

@ObjectType()
export class PaginatedEntity extends RelayTypes<EntityModel>(EntityModel) {}
