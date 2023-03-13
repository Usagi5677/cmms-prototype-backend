import { ArgsType } from '@nestjs/graphql';
import ConnectionArgs from '../../common/pagination/connection-args';

@ArgsType()
export class LocationAssignmentConnectionArgs extends ConnectionArgs {
  userIds: number[];
  current: boolean;
  userTypes?: string[];
  locationIds?: number[];
}
