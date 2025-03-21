import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(a, user) {
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
