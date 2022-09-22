import { InputType } from '@nestjs/graphql';

@InputType()
export class CreateSparePrInput {
  entityId: number;
  name: string;
  requestedDate?: Date;
  details?: string[];
}
