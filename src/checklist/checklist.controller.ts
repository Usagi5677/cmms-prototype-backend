import {
  Body,
  Controller,
  Get,
  Header,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Permissions } from 'src/decorators/permissions.decorator';
import { KeyGuard } from 'src/guards/key.guard';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { CreateEntityAttachmentInput } from 'src/resolvers/attachment/dto/create-entity-attachment.input';
import { AttachmentService } from 'src/services/attachment.service';
import { AuthService } from 'src/services/auth.service';
import { ChecklistService } from './checklist.service';

@UseGuards(KeyGuard, PermissionsGuard)
@Permissions('VIEW_ALL_ENTITY')
@Controller('checklist')
export class ChecklistController {
  constructor(
    private checklistService: ChecklistService,
    private authService: AuthService,
    private attachmentService: AttachmentService
  ) {}

  @Get()
  @Header('Content-Type', 'application/json')
  async getChecklist(@Query() query) {
    const results = await this.checklistService.findOne({
      entityId: parseInt(query.entityId),
      date: new Date(query.date),
      type: query.type,
    });

    // Rename keys for consistency
    delete Object.assign(results, {
      ['meterReading']: results['currentMeterReading'],
    })['currentMeterReading'];
    delete Object.assign(results, {
      ['dailyReading']: results['workingHour'],
    })['workingHour'];
    delete Object.assign(results, {
      ['dailyUsage']: results['dailyUsageHours'],
    })['dailyUsageHours'];

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

  @Post('comment/add')
  @Header('Content-Type', 'application/json')
  async addComment(@Body() input) {
    const user = await this.authService.validateUser(input.userUuid);
    await this.checklistService.addComment(
      user,
      parseInt(input.checklistId),
      input.comment
    );
  }

  @Post('comment/issue/add')
  @Header('Content-Type', 'application/json')
  async addIssue(@Body() input) {
    const user = await this.authService.validateUser(input.userUuid);
    await this.checklistService.addIssue(
      user,
      parseInt(input.checklistId),
      parseInt(input.checklistItemId),
      input.comment
    );
  }

  // Works for both comments and issues
  @Post('comment/remove')
  @Header('Content-Type', 'application/json')
  async removeComment(@Body() input) {
    const user = await this.authService.validateUser(input.userUuid);
    await this.checklistService.removeComment(user, parseInt(input.id));
  }

  @Post('attachment')
  @UseInterceptors(FilesInterceptor('attachments'))
  async uploadEntityAttachment(
    @UploadedFiles() attachments: Array<Express.Multer.File>,
    @Body() body: CreateEntityAttachmentInput
  ) {
    console.log(body);
    const user = await this.authService.validateUser(body.userUuid);
    await this.attachmentService.uploadSharepoint(user, attachments, body);
  }
}
