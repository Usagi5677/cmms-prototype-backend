import { Module, forwardRef } from '@nestjs/common';
import { LocationService } from './location.service';
import { LocationResolver } from './location.resolver';
import { LocationController } from './location.controller';
import { NotificationModule } from 'src/resolvers/notification/notification.module';
import { EntityModule } from 'src/entity/entity.module';
import { UserAssignmentModule } from 'src/user-assignment/user-assignment.module';
import { UserModule } from 'src/resolvers/user/user.module';

@Module({
  providers: [LocationResolver, LocationService],
  imports: [
    UserModule,
    NotificationModule,
    forwardRef(() => EntityModule),
    UserAssignmentModule,
  ],
  exports: [LocationService],
  controllers: [LocationController],
})
export class LocationModule {}
