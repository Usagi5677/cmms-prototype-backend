import { Module } from '@nestjs/common';
import { LocationService } from './location.service';
import { LocationResolver } from './location.resolver';
import { LocationController } from './location.controller';
import { NotificationModule } from 'src/resolvers/notification/notification.module';

@Module({
  imports: [NotificationModule],
  providers: [LocationResolver, LocationService],
  exports: [LocationService],
  controllers: [LocationController],
})
export class LocationModule {}
