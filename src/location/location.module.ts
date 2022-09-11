import { Module } from '@nestjs/common';
import { LocationService } from './location.service';
import { LocationResolver } from './location.resolver';
import { LocationController } from './location.controller';

@Module({
  providers: [LocationResolver, LocationService],
  exports: [LocationService],
  controllers: [LocationController],
})
export class LocationModule {}
