import { ObjectType } from '@nestjs/graphql';
import { BaseModel } from 'src/models/base.model';
import { User } from 'src/models/user.model';

@ObjectType()
export class EntityAttachment extends BaseModel {
  entityId: number;
  description: string;
  mimeType?: string;
  originalName?: string;
  sharepointFileName?: string;
  mode: string;
  completedBy?: User;
}
