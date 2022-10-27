import {
  Body,
  Controller,
  Get,
  Header,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Permissions } from 'src/decorators/permissions.decorator';
import { KeyGuard } from 'src/guards/key.guard';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { AuthService } from 'src/services/auth.service';
import { ChecklistService } from './checklist.service';

@UseGuards(KeyGuard, PermissionsGuard)
@Permissions('VIEW_ALL_ENTITY')
@Controller('checklist')
export class ChecklistController {
  constructor(
    private checklistService: ChecklistService,
    private authService: AuthService
  ) {}

  @Get()
  @Header('Content-Type', 'application/json')
  async getChecklist(@Query() query) {
    const results = await this.checklistService.findOne({
      entityId: parseInt(query.entityId),
      date: new Date(query.date),
      type: query.type,
    });
    return JSON.stringify(results, null, '\t');
  }

  @Post('update-meter-reading')
  @Header('Content-Type', 'application/json')
  async updateMeterReading(@Body() input) {
    const user = await this.authService.validateUser(input.userUuid);
    await this.checklistService.updateReading(
      user,
      parseInt(input.checklistId),
      parseInt(input.value)
    );
  }

  @Post('update-daily-reading')
  @Header('Content-Type', 'application/json')
  async updateDailyReading(@Body() input) {
    const user = await this.authService.validateUser(input.userUuid);
    await this.checklistService.updateWorkingHours(
      user,
      parseInt(input.checklistId),
      parseInt(input.value)
    );
  }

  @Post('update-daily-usage')
  @Header('Content-Type', 'application/json')
  async updateDailyUsage(@Body() input) {
    const user = await this.authService.validateUser(input.userUuid);
    await this.checklistService.updateDailyUsage(
      user,
      parseInt(input.checklistId),
      parseInt(input.value)
    );
  }

  @Post('item/toggle')
  @Header('Content-Type', 'application/json')
  async toggleChecklistItem(@Body() input) {
    const user = await this.authService.validateUser(input.userUuid);
    await this.checklistService.toggleChecklistItem(
      user,
      parseInt(input.checklistItemId),
      input.complete
    );
  }
}
