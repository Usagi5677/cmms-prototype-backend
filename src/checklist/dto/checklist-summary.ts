import { Field, ObjectType } from '@nestjs/graphql';
import { Checklist } from 'src/models/checklist.model';

@ObjectType()
export class ChecklistSummary extends Checklist {
  @Field()
  itemCompletion: string;
  @Field()
  hasComments: boolean;
  @Field()
  hasIssues: boolean;
}
