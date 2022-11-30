import { ObjectType } from '@nestjs/graphql';
import { InterServiceColor } from 'src/inter-service-color/entities/inter-service-color.entity';
import { BaseModel } from 'src/models/base.model';

@ObjectType()
export class Type extends BaseModel {
  entityType: string;
  name: string;
  interServiceColor?: InterServiceColor[];
}
