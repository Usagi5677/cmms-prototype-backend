import { ObjectType } from '@nestjs/graphql';

@ObjectType()
export class entityPMSummary {
  pm?: number[];
  checklist?: number[];
}
