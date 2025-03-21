// src/resolvers/auth/dto/auth.input.ts

import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

@InputType()
export class LoginInput {
  @Field()
  @IsEmail()
  email: string;

  @Field()
  @IsNotEmpty()
  @MinLength(8)
  password: string;
}

@ObjectType()
export class UserData {
  @Field()
  id: string;

  @Field()
  email: string;

  @Field()
  name: string;
}

@ObjectType()
export class AuthResponse {
  @Field()
  token: string;

  @Field(() => UserData)
  user: UserData;
}
