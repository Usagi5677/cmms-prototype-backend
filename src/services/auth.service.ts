import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'nestjs-prisma';
import { User } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { SecurityConfig } from 'src/configs/config.interface';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  async login(email: string, password: string) {
    // First, find the user by email
    const user = await this.prisma.user.findFirst({ where: { email } });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check if the user has a password (first-time login)
    if (!user.password) {
      // For the first login of existing users, we can set a default password
      // This is for the existing user in your DB
      if (email === 'testing@gmail.com') {
        // Create a hashed password and update the user
        const hashedPassword = await bcrypt.hash('test', 10);
        await this.prisma.user.update({
          where: { id: user.id },
          data: { password: hashedPassword },
        });

        // Generate the JWT token
        return this.generateToken(user);
      }
      throw new UnauthorizedException(
        'Account setup required. Please contact an administrator.'
      );
    }

    // Verify the password
    const passwordValid = await bcrypt.compare(password, user.password);

    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.generateToken(user);
  }

  async refreshToken(user: User) {
    return this.generateToken(user);
  }

  private generateToken(user: User) {
    // Use user.id (numeric) as the userId in the token
    const token = this.jwtService.sign({ userId: user.id });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.fullName,
      },
    };
  }

  // Method to generate a password hash
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  async validateUser(uuid: string): Promise<User> {
    const user = await this.prisma.user.findFirst({
      where: { userId: uuid },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }
}
