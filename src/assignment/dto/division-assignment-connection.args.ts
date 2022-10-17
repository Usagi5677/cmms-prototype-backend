import { ArgsType } from '@nestjs/graphql';
import ConnectionArgs from '../../common/pagination/connection-args';

@ArgsType()
export class DivisionAssignmentConnectionArgs extends ConnectionArgs {
  userIds: number[];
  current: boolean;
  divisionIds?: number[];
}
