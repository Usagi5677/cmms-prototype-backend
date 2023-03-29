import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';

import {
  autoAssignUsersInterface,
  UserAssignmentService,
} from './user-assignment.service';

@Processor('cmms-user-assignment-queue')
export class UserAssignmentConsumer {
  private readonly logger = new Logger(UserAssignmentConsumer.name);

  constructor(private readonly userAssignmentService: UserAssignmentService) {}

  @Process('autoAssignUsers')
  async create({
    data: { autoAssignUsers },
  }: Job<{ autoAssignUsers: autoAssignUsersInterface }>) {
    this.logger.verbose('JOB - Auto Assign Users');
    await this.userAssignmentService.autoAssignUsers(autoAssignUsers);
  }
}
