import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { EntityService, EntityHistoryInterface } from './entity.service';

@Processor('cmms-entity-history')
export class EntityConsumer {
  private readonly logger = new Logger(EntityConsumer.name);

  constructor(private readonly entityService: EntityService) {}

  @Process('createEntityHistory')
  async create({
    data: { entityHistory },
  }: Job<{ entityHistory: EntityHistoryInterface }>) {
    await this.entityService.createEntityHistory(entityHistory);
    this.logger.verbose('JOB - Create Entity History');
  }
}
