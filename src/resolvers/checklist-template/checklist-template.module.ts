import { forwardRef, Module } from '@nestjs/common';
import { ChecklistTemplateService } from './checklist-template.service';
import { ChecklistTemplateResolver } from './checklist-template.resolver';
import { EntityModule } from 'src/entity/entity.module';

@Module({
  providers: [ChecklistTemplateResolver, ChecklistTemplateService],
  exports: [ChecklistTemplateService],
  imports: [forwardRef(() => EntityModule)],
})
export class ChecklistTemplateModule {}
