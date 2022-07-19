import { InputType } from '@nestjs/graphql';

@InputType()
export class ChangeChecklistTemplateInput {
  entityId: number;
  entityType: string;
  newChecklistId: number;
}
