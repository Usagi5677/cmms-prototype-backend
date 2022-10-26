import { InputType } from '@nestjs/graphql';

@InputType()
export class CreateChecklistTemplateInput {
  name: string;
  type: string;
  items: string[];
}
