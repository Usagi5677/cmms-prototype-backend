import { Module } from '@nestjs/common';
import { TypeService } from './type.service';
import { TypeResolver } from './type.resolver';
import { TypeController } from './type.controller';
import { UserModule } from 'src/resolvers/user/user.module';

@Module({
  providers: [TypeResolver, TypeService],
  imports: [UserModule],
  controllers: [TypeController],
})
export class TypeModule {}
