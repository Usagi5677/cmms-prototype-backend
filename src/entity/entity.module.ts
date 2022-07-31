import { Module } from '@nestjs/common';
import { EntityService } from './entity.service';
import { EntityResolver } from './entity.resolver';

@Module({
  providers: [EntityResolver, EntityService]
})
export class EntityModule {}
