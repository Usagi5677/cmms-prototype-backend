import { Module } from '@nestjs/common';
import { ChecklistTemplateService } from './checklist-template.service';
import { ChecklistTemplateResolver } from './checklist-template.resolver';

@Module({
  providers: [ChecklistTemplateResolver, ChecklistTemplateService],
  exports: [ChecklistTemplateService],
})
export class ChecklistTemplateModule {}
