import { ArgsType } from '@nestjs/graphql';
import ConnectionArgs from '../../common/pagination/connection-args';

@ArgsType()
export class UserAssignmentConnectionArgs extends ConnectionArgs {
  search?: string;
  types?: string[];
  locationIds?: number[];
  zoneIds?: number[];
  userIds?: number[];
}
