import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ChecklistService } from 'src/checklist/checklist.service';
import { PeriodicMaintenanceService } from 'src/periodic-maintenance/periodic-maintenance.service';

@Injectable()
export class InitService implements OnApplicationBootstrap {
  private readonly logger = new Logger(InitService.name);
  constructor(
    private checklistService: ChecklistService,
    private periodicMaintenanceService: PeriodicMaintenanceService
  ) {}

  async onApplicationBootstrap() {
    await this.checklistService.generateChecklists();
    await this.periodicMaintenanceService.generatePeriodicMaintenances();
    await this.periodicMaintenanceService.notificationReminder();
  }
}
