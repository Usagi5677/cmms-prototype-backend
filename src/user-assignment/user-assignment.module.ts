import { Module } from '@nestjs/common';
import { UserAssignmentService } from './user-assignment.service';
import { UserAssignmentResolver } from './user-assignment.resolver';
import { NotificationModule } from 'src/resolvers/notification/notification.module';

@Module({
  providers: [UserAssignmentResolver, UserAssignmentService],
  imports: [NotificationModule],
  exports: [UserAssignmentService],
})
export class UserAssignmentModule {}
