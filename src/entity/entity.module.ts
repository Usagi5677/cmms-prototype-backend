import { forwardRef, Module } from '@nestjs/common';
import { EntityService } from './entity.service';
import { EntityResolver } from './entity.resolver';
import { RedisCacheModule } from 'src/redisCache.module';
import { UserModule } from 'src/resolvers/user/user.module';
import { NotificationModule } from 'src/resolvers/notification/notification.module';
import { BullModule } from '@nestjs/bull';
import { ChecklistTemplateModule } from 'src/resolvers/checklist-template/checklist-template.module';
import { EntityConsumer } from './entity.consumer';
import { LocationModule } from 'src/location/location.module';
import { AuthModule } from 'src/resolvers/auth/auth.module';
import { EntityController } from './entity.controller';
import { ChecklistModule } from 'src/checklist/checklist.module';

@Module({
  imports: [
    RedisCacheModule,
    UserModule,
    NotificationModule,
    BullModule.registerQueue({
      name: 'cmms-entity-history',
    }),
    forwardRef(() => ChecklistTemplateModule),
    ChecklistModule,
    LocationModule,
    AuthModule,
  ],
  providers: [EntityResolver, EntityService, EntityConsumer],
  exports: [EntityService],
  controllers: [EntityController],
})
export class EntityModule {}
