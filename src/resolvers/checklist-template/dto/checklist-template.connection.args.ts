import { ArgsType } from '@nestjs/graphql';
import ConnectionArgs from 'src/common/pagination/connection-args';

@ArgsType()
export class ChecklistTemplateConnectionArgs extends ConnectionArgs {
  search?: string;
  type?: string;
}
