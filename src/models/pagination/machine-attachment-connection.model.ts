import { ObjectType } from '@nestjs/graphql';
import RelayTypes from '../../common/pagination/relay-types';
import { MachineAttachment } from '../machine-attachment.model';

@ObjectType()
export class PaginatedMachineAttachment extends RelayTypes<MachineAttachment>(
  MachineAttachment
) {}
