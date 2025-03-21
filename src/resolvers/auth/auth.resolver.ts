import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { AuthService } from 'src/services/auth.service';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../../guards/gql-auth.guard';
import { UserEntity } from '../../decorators/user.decorator';
import { User } from '@prisma/client';
import { AuthResponse } from './dto/auth.input';

@Resolver()
export class AuthResolver {
  constructor(private readonly auth: AuthService) {}

  @Mutation(() => AuthResponse)
  async login(
    @Args('email') email: string,
    @Args('password') password: string
  ) {
    return this.auth.login(email, password);
  }

  @UseGuards(GqlAuthGuard)
  @Mutation(() => AuthResponse)
  async refreshToken(@UserEntity() user: User) {
    return this.auth.refreshToken(user);
  }
}
