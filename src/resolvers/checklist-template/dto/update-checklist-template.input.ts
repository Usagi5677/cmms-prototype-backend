import { CreateChecklistTemplateInput } from './create-checklist-template.input';
import { InputType, PartialType } from '@nestjs/graphql';

@InputType()
export class UpdateChecklistTemplateInput extends PartialType(
  CreateChecklistTemplateInput
) {
  id: number;
}
