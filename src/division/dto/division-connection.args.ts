import { ArgsType } from '@nestjs/graphql';
import ConnectionArgs from '../../common/pagination/connection-args';

@ArgsType()
export class DivisionConnectionArgs extends ConnectionArgs {
  divisionId?: number;
  name?: string;
}
