import { ArgsType } from '@nestjs/graphql';
import ConnectionArgs from '../../common/pagination/connection-args';

@ArgsType()
export class AssignmentConnectionArgs extends ConnectionArgs {
  entityIds: number[];
  userIds: number[];
  current: boolean;
  type?: string;
}
