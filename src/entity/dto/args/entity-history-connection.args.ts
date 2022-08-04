import { ArgsType } from '@nestjs/graphql';
import ConnectionArgs from 'src/common/pagination/connection-args';

@ArgsType()
export class EntityHistoryConnectionArgs extends ConnectionArgs {
  search?: string;
  entityId: number;
  from?: Date;
  to?: Date;
  location?: string[];
}
