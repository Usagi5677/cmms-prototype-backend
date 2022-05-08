import { ObjectType } from '@nestjs/graphql';
import { BaseModel } from './base.model';
import { User } from './user.model';

@ObjectType()
export class MachineAttachment extends BaseModel {
  machineId: number;
  description: string;
  mimeType?: string;
  originalName?: string;
  sharepointFileName?: string;
  mode: string;
  completedBy?: User;
}
