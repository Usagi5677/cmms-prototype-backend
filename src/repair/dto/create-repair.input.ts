import { InputType } from '@nestjs/graphql';

@InputType()
export class CreateRepairInput {
  entityId: number;
  breakdownId?: number;
  name: string;
}
