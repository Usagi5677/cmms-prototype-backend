import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import {
  TransportationHistoryInterface,
  TransportationService,
} from 'src/services/transportation.service';

@Processor('cmms-transportation-history')
export class TransportationConsumer {
  private readonly logger = new Logger(TransportationConsumer.name);

  constructor(private readonly transportationService: TransportationService) {}

  @Process('createTransportationHistory')
  async create({
    data: { transportationHistory },
  }: Job<{ transportationHistory: TransportationHistoryInterface }>) {
    await this.transportationService.createTransportationHistory(
      transportationHistory
    );
    this.logger.verbose('JOB - Create Transportation History');
  }
}
