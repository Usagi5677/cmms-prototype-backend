import { ArgsType } from '@nestjs/graphql';
import ConnectionArgs from '../../common/pagination/connection-args';

@ArgsType()
export class InterServiceColorConnectionArgs extends ConnectionArgs {
  name?: string;
}
