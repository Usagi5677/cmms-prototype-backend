import { InputType } from '@nestjs/graphql';

@InputType()
export class CreateBrandInput {
  name: string;
}
