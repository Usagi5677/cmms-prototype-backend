import { ObjectType } from '@nestjs/graphql';
import RelayTypes from 'src/common/pagination/relay-types';
import { EntityPMTask } from '../models/entity-PM-task.model';

@ObjectType()
export class PaginatedEntityPeriodicMaintenanceTask extends RelayTypes<EntityPMTask>(
  EntityPMTask
) {}
