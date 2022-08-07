import { InputType } from '@nestjs/graphql';

@InputType()
export class ChangeChecklistTemplateInput {
  entityId: number;
  newChecklistId: number;
}
