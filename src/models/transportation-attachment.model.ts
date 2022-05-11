import { ObjectType } from '@nestjs/graphql';
import { BaseModel } from './base.model';
import { User } from './user.model';

@ObjectType()
export class TransportationAttachment extends BaseModel {
  transportationId: number;
  description: string;
  mimeType?: string;
  originalName?: string;
  sharepointFileName?: string;
  mode: string;
  completedBy?: User;
}
