import { Field, InputType } from '@nestjs/graphql';
import { GraphQLFloat } from 'graphql';

@InputType()
export class CreateEntityInput {
  typeId?: number;
  machineNumber?: string;
  model?: string;
  locationId?: number;
  divisionId?: number;
  engineId?: number;
  measurement?: string;
  currentRunning?: number;
  lastService?: number;
  brandId?: number;
  registeredDate?: Date;
  parentEntityId?: number;
  hullTypeId?: number;
  @Field(() => GraphQLFloat)
  dimension?: typeof GraphQLFloat;
  registryNumber?: string;
  capacity?: string;
  identificationNumber?: string;
  faCode?: string;
}
