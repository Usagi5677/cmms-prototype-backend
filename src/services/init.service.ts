import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ChecklistService } from 'src/checklist/checklist.service';

@Injectable()
export class InitService implements OnApplicationBootstrap {
  private readonly logger = new Logger(InitService.name);
  constructor(private checklistService: ChecklistService) {}

  async onApplicationBootstrap() {
    await this.checklistService.generateChecklists();
    //await this.periodicMaintenanceService.generatePeriodicMaintenances();
    //await this.periodicMaintenanceService.notificationReminder();
  }
}
