import { forwardRef, Module } from '@nestjs/common';
import { ChecklistTemplateService } from './checklist-template.service';
import { ChecklistTemplateResolver } from './checklist-template.resolver';
import { EntityModule } from 'src/entity/entity.module';
import { BullModule } from '@nestjs/bull';
import { ChecklistTemplateConsumer } from './checklist-template.consumer';

@Module({
  providers: [
    ChecklistTemplateResolver,
    ChecklistTemplateService,
    ChecklistTemplateConsumer,
  ],
  exports: [ChecklistTemplateService],
  imports: [
    forwardRef(() => EntityModule),
    BullModule.registerQueue({
      name: 'cmms-update-task',
    }),
  ],
})
export class ChecklistTemplateModule {}
