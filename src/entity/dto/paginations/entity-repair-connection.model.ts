import { ObjectType } from '@nestjs/graphql';
import RelayTypes from 'src/common/pagination/relay-types';
import { EntityRepairRequest } from '../models/entity-repair-request.model';

@ObjectType()
export class PaginatedEntityRepair extends RelayTypes<EntityRepairRequest>(
  EntityRepairRequest
) {}
