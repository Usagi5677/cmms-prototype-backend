import { Module } from '@nestjs/common';
import { BrandService } from './brand.service';
import { BrandResolver } from './brand.resolver';
import { UserModule } from 'src/resolvers/user/user.module';

@Module({
  providers: [BrandResolver, BrandService],
  imports: [UserModule],
})
export class BrandModule {}
