import { ArgsType } from '@nestjs/graphql';
import ConnectionArgs from 'src/common/pagination/connection-args';

@ArgsType()
export class EntitySparePRConnectionArgs extends ConnectionArgs {
  search?: string;
  entityId: number;
}
