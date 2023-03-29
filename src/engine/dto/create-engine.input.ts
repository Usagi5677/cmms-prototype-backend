import { InputType } from '@nestjs/graphql';

@InputType()
export class CreateEngineInput {
  name: string;
  model?: string;
  serial?: string;
}
