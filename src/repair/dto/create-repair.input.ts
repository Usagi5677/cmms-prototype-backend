import { InputType } from '@nestjs/graphql';

@InputType()
export class CreateRepairInput {
  entityId: number;
  breakdownId?: number;
  breakdownDetailId?: number;
  name: string;
}
