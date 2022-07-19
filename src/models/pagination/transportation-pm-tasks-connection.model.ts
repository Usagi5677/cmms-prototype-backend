import { ObjectType } from '@nestjs/graphql';
import RelayTypes from '../../common/pagination/relay-types';
import { TransportationPMTask } from '../transportation-PM-task.model';

@ObjectType()
export class PaginatedTransportationPeriodicMaintenanceTask extends RelayTypes<TransportationPMTask>(
  TransportationPMTask
) {}
