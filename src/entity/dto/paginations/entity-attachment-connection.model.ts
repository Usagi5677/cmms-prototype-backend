import { ObjectType } from '@nestjs/graphql';
import RelayTypes from 'src/common/pagination/relay-types';
import { EntityAttachment } from '../models/entity-attachment.model';

@ObjectType()
export class PaginatedEntityAttachment extends RelayTypes<EntityAttachment>(
  EntityAttachment
) {}
