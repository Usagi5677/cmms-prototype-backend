import { InputType } from '@nestjs/graphql';

@InputType()
export class EntityChecklistTemplateInput {
  entityId: number;
  type: string;
}
