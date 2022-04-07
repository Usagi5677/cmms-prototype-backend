import { ArgsType } from '@nestjs/graphql';
import ConnectionArgs from '../../common/pagination/connection-args';

@ArgsType()
export class MachineBreakdownConnectionArgs extends ConnectionArgs {
  search?: string;
  machineId: number;
}
