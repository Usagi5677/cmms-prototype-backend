import { ArgsType } from '@nestjs/graphql';
import ConnectionArgs from '../../common/pagination/connection-args';

@ArgsType()
export class TypeConnectionArgs extends ConnectionArgs {
  name?: string;
  entityType?: string;
}
