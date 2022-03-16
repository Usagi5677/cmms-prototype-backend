import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import {
  Notification,
  NotificationService,
} from '../../services/notification.service';
import { SendMailOptions } from 'nodemailer';

@Processor('cmms-notification')
export class NotificationConsumer {
  private readonly logger = new Logger(NotificationConsumer.name);

  constructor(private readonly notificationService: NotificationService) {}

  @Process('create')
  async create({
    data: { notification, emailOptions },
  }: Job<{ notification: Notification; emailOptions?: SendMailOptions }>) {
    await this.notificationService.create(notification, emailOptions);
    this.logger.verbose('JOB - Create Notification');
  }

  @Process('sendEmail')
  async sendEmail({ data: { options } }: Job<{ options: SendMailOptions }>) {
    await this.notificationService.sendEmail(options);
    this.logger.verbose('JOB - Send Email');
  }
}
