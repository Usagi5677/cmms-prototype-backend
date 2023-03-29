import { Module } from '@nestjs/common';
import { UserAssignmentService } from './user-assignment.service';
import { UserAssignmentResolver } from './user-assignment.resolver';
import { NotificationModule } from 'src/resolvers/notification/notification.module';
import { BullModule } from '@nestjs/bull';
import { UserAssignmentConsumer } from './user-assignment.consumer';

@Module({
  providers: [
    UserAssignmentResolver,
    UserAssignmentService,
    UserAssignmentConsumer,
  ],
  imports: [
    NotificationModule,
    BullModule.registerQueue({
      name: 'cmms-user-assignment-queue',
    }),
  ],
  exports: [UserAssignmentService],
})
export class UserAssignmentModule {}
