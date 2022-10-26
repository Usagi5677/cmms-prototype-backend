import { Module } from '@nestjs/common';
import { DivisionService } from './division.service';
import { DivisionResolver } from './division.resolver';
import { NotificationModule } from 'src/resolvers/notification/notification.module';

@Module({
  imports: [NotificationModule],
  providers: [DivisionResolver, DivisionService],
})
export class DivisionModule {}
