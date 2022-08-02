import { Module } from '@nestjs/common';
import { TypeService } from './type.service';
import { TypeResolver } from './type.resolver';

@Module({
  providers: [TypeResolver, TypeService]
})
export class TypeModule {}
