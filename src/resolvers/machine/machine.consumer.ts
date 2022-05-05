import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import {
  MachineHistoryInterface,
  MachineService,
} from 'src/services/machine.service';

@Processor('cmms-machine-history')
export class MachineConsumer {
  private readonly logger = new Logger(MachineConsumer.name);

  constructor(private readonly machineService: MachineService) {}

  @Process('createMachineHistory')
  async create({
    data: { machineHistory },
  }: Job<{ machineHistory: MachineHistoryInterface }>) {
    await this.machineService.createMachineHistory(machineHistory);
    this.logger.verbose('JOB - Create Machine History');
  }
}
