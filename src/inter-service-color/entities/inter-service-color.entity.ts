import { ObjectType } from '@nestjs/graphql';
import { Brand } from 'src/brand/entities/brand.entity';
import { BaseModel } from 'src/models/base.model';
import { Type } from 'src/type/entities/type.entity';

@ObjectType()
export class InterServiceColor extends BaseModel {
  measurement: string;
  greaterThan: number;
  lessThan: number;
  type?: Type;
  brand?: Brand;
}
