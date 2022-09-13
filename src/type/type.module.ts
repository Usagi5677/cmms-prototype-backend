import { Module } from '@nestjs/common';
import { TypeService } from './type.service';
import { TypeResolver } from './type.resolver';
import { TypeController } from './type.controller';

@Module({
  providers: [TypeResolver, TypeService],
  controllers: [TypeController],
})
export class TypeModule {}
