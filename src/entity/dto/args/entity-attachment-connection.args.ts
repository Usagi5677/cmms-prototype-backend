import { ArgsType } from '@nestjs/graphql';
import ConnectionArgs from 'src/common/pagination/connection-args';

@ArgsType()
export class EntityAttachmentConnectionArgs extends ConnectionArgs {
  search?: string;
  entityId: number;
}
