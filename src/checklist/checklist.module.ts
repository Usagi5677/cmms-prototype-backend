import { Module, forwardRef } from '@nestjs/common';
import { ChecklistService } from './checklist.service';
import { ChecklistResolver } from './checklist.resolver';
import { ChecklistTemplateModule } from 'src/resolvers/checklist-template/checklist-template.module';
import { EntityModule } from 'src/entity/entity.module';

@Module({
  providers: [ChecklistResolver, ChecklistService],
  imports: [ChecklistTemplateModule, forwardRef(() => EntityModule)],
  exports: [ChecklistService],
})
export class ChecklistModule {}
