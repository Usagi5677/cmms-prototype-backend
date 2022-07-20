import { Module } from '@nestjs/common';
import { ChecklistService } from './checklist.service';
import { ChecklistResolver } from './checklist.resolver';
import { ChecklistTemplateModule } from 'src/resolvers/checklist-template/checklist-template.module';

@Module({
  providers: [ChecklistResolver, ChecklistService],
  imports: [ChecklistTemplateModule],
  exports: [ChecklistService],
})
export class ChecklistModule {}
