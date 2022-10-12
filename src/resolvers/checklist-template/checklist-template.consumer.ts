import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import {
  ChecklistTemplateService,
  UpdateTaskInterface,
} from './checklist-template.service';

@Processor('cmms-update-task')
export class ChecklistTemplateConsumer {
  private readonly logger = new Logger(ChecklistTemplateConsumer.name);

  constructor(
    private readonly checklistTemplateService: ChecklistTemplateService
  ) {}

  @Process('updateTask')
  async create({
    data: { updateTask },
  }: Job<{ updateTask: UpdateTaskInterface }>) {
    if (updateTask.add) {
      await this.checklistTemplateService.updateChecklistOfAllEntitiesUsingTemplate(
        updateTask
      );
      this.logger.verbose('JOB - Add Task');
    } else {
      await this.checklistTemplateService.updateChecklistOfAllEntitiesUsingTemplate(
        updateTask
      );
      this.logger.verbose('JOB - Remove Task');
    }
  }
}
