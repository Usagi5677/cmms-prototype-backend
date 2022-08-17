import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { PrismaService } from 'src/prisma/prisma.service';
import { AttachmentService } from 'src/services/attachment.service';
import * as moment from 'moment';
import { extname } from 'path';
import { CreateEntityAttachmentInput } from 'src/resolvers/attachment/dto/create-entity-attachment.input';
import { EntityService } from 'src/entity/entity.service';
import { IMAGE_CACHE_DURATION } from 'src/constants';

@Controller('attachment')
export class AttachmentController {
  constructor(
    private prisma: PrismaService,
    private readonly attachmentService: AttachmentService,
    private readonly entityService: EntityService
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('entity-upload')
  @UseInterceptors(FileInterceptor('attachment'))
  async uploadEntityAttachment(
    @Req() req,
    @UploadedFile() attachment: Express.Multer.File,
    @Body() { entityId, description, checklistId }: CreateEntityAttachmentInput
  ) {
    const user = req.user;

    // Only allow images to be uploaded to checklists
    if (checklistId && attachment.mimetype.substring(0, 6) !== 'image/') {
      console.log(attachment.mimetype.substring(0, 6));
      throw new BadRequestException('Not an image file.');
    }

    // Max allowed file size in bytes.
    const maxFileSize = 2 * 1000000;
    if (attachment.size > maxFileSize) {
      throw new BadRequestException('File size cannot be greater than 2 MB.');
    }
    const mode = 'Public';
    let newAttachment: any;
    const sharepointFileName = `${user.rcno}_${moment().unix()}${extname(
      attachment.originalname
    )}`;
    try {
      newAttachment = await this.prisma.entityAttachment.create({
        data: {
          userId: user.id,
          entityId: parseInt(entityId),
          description,
          mode,
          originalName: attachment.originalname,
          mimeType: attachment.mimetype,
          sharepointFileName,
          checklistId: parseInt(checklistId) ?? null,
        },
      });
      //add to history
      await this.entityService.createEntityHistoryInBackground({
        type: 'Add Attachment',
        description: `Added attachment (${newAttachment.id})`,
        entityId: parseInt(entityId),
        completedById: user.id,
      });
      try {
        await this.attachmentService.uploadFile(attachment, {
          name: sharepointFileName,
        });
      } catch (error) {
        if (newAttachment?.id) {
          await this.prisma.entityAttachment.delete({
            where: { id: newAttachment.id },
          });
        }
        throw error;
      }
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('entity/:id')
  async viewEntityAttachment(@Req() req, @Param() params, @Res() res) {
    const user = req.user;
    const attachmentId = parseInt(params.id);
    const attachment = await this.prisma.entityAttachment.findFirst({
      where: { id: attachmentId },
    });
    if (!attachment) {
      throw new BadRequestException('Attachment does not exist.');
    }
    await this.entityService.checkEntityAssignmentOrPermission(
      attachment.entityId,
      user.id,
      undefined,
      [],
      ['VIEW_ALL_ENTITY']
    );
    const file = await this.attachmentService.getFile(
      attachment.sharepointFileName
    );
    const fileData = file.data;
    res.set({
      'Content-Disposition': `inline; filename=${
        attachment.originalName ?? attachment.sharepointFileName
      }`,
      'Content-Type': attachment.mimeType ?? null,
      'Cache-Control': `max-age=${IMAGE_CACHE_DURATION}, public`,
    });
    res.end(fileData);
  }
}
