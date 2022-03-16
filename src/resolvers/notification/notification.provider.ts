import { Provider } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export const Nodemailer = 'lib:nodemailer';

export const NotificationProvider: Provider = {
  provide: Nodemailer,
  useValue: nodemailer,
};
