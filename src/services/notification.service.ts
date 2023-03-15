import { InjectQueue } from '@nestjs/bull';
import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
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
      pool: true,
      maxConnections: 3,
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
    try {
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
      await this.pubSub.publish('cmms-notificationCreated', {
        notificationCreated: notif,
      });
    } catch (e) {
      console.log(e);
      this.logger.error(e);
    }
  }

  async sendEmail(options: SendMailOptions) {
    //const to = [...((options.to as any[]) ?? [])];
    //return;
    if (options.to.length > 0) {
      // Retries 5 times if email fails. 10 second interval between each retry.
      let count = 0;
      const maxTries = 5;
      while (true) {
        try {
          await this.transporter.sendMail({
            ...options,
            from: `"CMMS" <no-reply@mtcc.com.mv>`,
          });
          break;
        } catch (err) {
          this.logger.error(err);
          count += 1;
          if (count === maxTries) break;
          this.logger.verbose('Retrying...');
          await new Promise((resolve) => setTimeout(resolve, 10000));
        }
      }
    }
  }

  async createInBackground(
    notification: Notification,
    emailOptions?: SendMailOptions
  ) {
    try {
      await this.notificationQueue.add('create', {
        notification,
        emailOptions,
      });
    } catch (e) {
      console.log(e);
      this.logger.error(e);
    }
  }

  async sendEmailInBackground(options: SendMailOptions) {
    try {
      await this.notificationQueue.add('sendEmail', { options });
    } catch (e) {
      console.log(e);
      this.logger.error(e);
    }
  }
}
