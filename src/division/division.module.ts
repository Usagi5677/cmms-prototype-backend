import { Module } from '@nestjs/common';
import { DivisionService } from './division.service';
import { DivisionResolver } from './division.resolver';
import { NotificationModule } from 'src/resolvers/notification/notification.module';
import { UserAssignmentModule } from 'src/user-assignment/user-assignment.module';

@Module({
  imports: [NotificationModule, UserAssignmentModule],
  providers: [DivisionResolver, DivisionService],
})
export class DivisionModule {}
