import { Controller, Get, Header, UseGuards, Param } from '@nestjs/common';
import { Permissions } from 'src/decorators/permissions.decorator';
import { KeyGuard } from 'src/guards/key.guard';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { LocationService } from './location.service';

@UseGuards(KeyGuard, PermissionsGuard)
@Controller('location')
export class LocationController {
  constructor(private locationService: LocationService) {}

  @Permissions('MODIFY_LOCATIONS')
  @Get()
  @Header('Content-Type', 'application/json')
  async locations(): Promise<Object> {
    const results = await this.locationService.findEvery();
    return JSON.stringify(results, null, '\t');
  }

  @Permissions('MODIFY_LOCATIONS')
  @Get(':id')
  @Header('Content-Type', 'application/json')
  async location(@Param() params): Promise<Object> {
    const id = parseInt(params.id);
    const results = await this.locationService.findOne(id);
    return JSON.stringify(results, null, '\t');
  }
}
