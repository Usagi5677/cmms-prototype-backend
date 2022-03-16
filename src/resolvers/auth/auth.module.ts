import { PasswordService } from './../../services/password.service';
import { GqlAuthGuard } from '../../guards/gql-auth.guard';
import { AuthService } from '../../services/auth.service';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { ConfigService } from '@nestjs/config';
import { SecurityConfig } from 'src/configs/config.interface';
import { PrismaModule } from 'src/prisma/prisma.module';
import { APSModule } from '../profile/profile.module';
import { UserModule } from '../user/user.module';
import { RedisCacheModule } from 'src/redisCache.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: async (configService: ConfigService) => {
        const securityConfig = configService.get<SecurityConfig>('security');
        return {
          secret: configService.get<string>('JWT_ACCESS_SECRET'),
          signOptions: {
            expiresIn: securityConfig.expiresIn,
          },
        };
      },
      inject: [ConfigService],
    }),
    PrismaModule,
    APSModule,
    UserModule,
    RedisCacheModule,
  ],
  providers: [AuthService, JwtStrategy, GqlAuthGuard, PasswordService],
  exports: [GqlAuthGuard, AuthService],
})
export class AuthModule {}
