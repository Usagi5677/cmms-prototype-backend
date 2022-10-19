import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import {
  PeriodicMaintenanceService,
  UpdatePMTaskInterface,
} from './periodic-maintenance.service';

@Processor('cmms-pm-queue')
export class PeriodicMaintenanceConsumer {
  private readonly logger = new Logger(PeriodicMaintenanceConsumer.name);

  constructor(
    private readonly periodicMaintenanceService: PeriodicMaintenanceService
  ) {}

  @Process('updatePMTask')
  async create({
    data: { updatePMTask },
  }: Job<{ updatePMTask: UpdatePMTaskInterface }>) {
    this.logger.verbose('JOB - Update PM Task');
    await this.periodicMaintenanceService.createInnerTasks(updatePMTask);
  }
}
