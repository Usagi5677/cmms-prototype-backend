import { InputType } from '@nestjs/graphql';

@InputType()
export class CreateHullTypeInput {
  name: string;
}
