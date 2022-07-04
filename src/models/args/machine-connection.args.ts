import { ArgsType } from '@nestjs/graphql';
import { MachineStatus } from 'src/common/enums/machineStatus';
import ConnectionArgs from '../../common/pagination/connection-args';

@ArgsType()
export class MachineConnectionArgs extends ConnectionArgs {
  search?: string;
  createdById?: number;
  self?: boolean;
  assignedToId?: number;
  createdByUserId?: string;
  status?: MachineStatus;
  location?: string;
}
