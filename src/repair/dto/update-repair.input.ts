import { CreateRepairInput } from './create-repair.input';
import { InputType, Field, Int, PartialType } from '@nestjs/graphql';

@InputType()
export class UpdateRepairInput extends PartialType(CreateRepairInput) {
  id: number;
  name: string;
}
