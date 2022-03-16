import { InjectQueue } from '@nestjs/bull';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bull';
import nm, { SendMailOptions, Transporter } from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { PrismaService } from '../prisma/prisma.service';
import { Nodemailer } from '../resolvers/notification/notification.provider';
import { PubSub } from 'graphql-subscriptions';
import { PUB_SUB } from 'src/resolvers/pubsub/pubsub.module';
import { RedisPubSub } from 'graphql-redis-subscriptions';

export interface Notification {
  userId: number;
  body: string;
  link?: string;
}

export const pubSubTwo = new PubSub();
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly transporter: Transporter<SMTPTransport.SentMessageInfo>;

  constructor(
    @Inject(Nodemailer) private nodemailer: typeof nm,
    @InjectQueue('cmms-notification') private notificationQueue: Queue,
    private readonly prisma: PrismaService,
    @Inject(PUB_SUB) private readonly pubSub: RedisPubSub
  ) {
    this.transporter = this.nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        ciphers: 'SSLv3',
      },
    });
  }

  async create(notification: Notification, emailOptions?: SendMailOptions) {
    const notif = await this.prisma.notification.create({
      data: {
        body: notification.body,
        userId: notification.userId,
        link: notification.link,
      },
    });

    if (emailOptions) {
      this.sendEmail(emailOptions);
    }
    await this.pubSub.publish('notificationCreated', {
      notificationCreated: notif,
    });
  }

  async sendEmail(options: SendMailOptions) {
    //const to = [...((options.to as any[]) ?? [])];
    //return;
    if (options.to.length > 0) {
      await this.transporter.sendMail({
        ...options,
        from: `"cmms" <no-reply@mtcc.com.mv>`,
        //to: options.to,
        //subject: options.subject ? `Helpdesk: ${options.subject}` : undefined,
      });
    }
  }

  async createInBackground(
    notification: Notification,
    emailOptions?: SendMailOptions
  ) {
    await this.notificationQueue.add('create', { notification, emailOptions });
  }

  async sendEmailInBackground(options: SendMailOptions) {
    await this.notificationQueue.add('sendEmail', { options });
  }
}
