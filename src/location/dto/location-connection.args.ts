import { ArgsType } from '@nestjs/graphql';
import ConnectionArgs from '../../common/pagination/connection-args';

@ArgsType()
export class LocationConnectionArgs extends ConnectionArgs {
  name?: string;
  zoneId?: number;
  showOnlyUnzoned?: boolean;
  withSkipFriday?: boolean;
}
