import { forwardRef, Module } from '@nestjs/common';
import { ChecklistTemplateService } from './checklist-template.service';
import { ChecklistTemplateResolver } from './checklist-template.resolver';
import { EntityModule } from 'src/entity/entity.module';
import { BullModule } from '@nestjs/bull';
import { ChecklistTemplateConsumer } from './checklist-template.consumer';
import { UserModule } from '../user/user.module';

@Module({
  providers: [
    ChecklistTemplateResolver,
    ChecklistTemplateService,
    ChecklistTemplateConsumer,
  ],
  exports: [ChecklistTemplateService],
  imports: [
    UserModule,
    forwardRef(() => EntityModule),
    BullModule.registerQueue({
      name: 'cmms-update-task',
    }),
  ],
})
export class ChecklistTemplateModule {}
