import { ObjectType } from '@nestjs/graphql';
import RelayTypes from '../../common/pagination/relay-types';
import { MachineHistory } from '../machine-history.model';

@ObjectType()
export class PaginatedMachineHistory extends RelayTypes<MachineHistory>(
  MachineHistory
) {}
