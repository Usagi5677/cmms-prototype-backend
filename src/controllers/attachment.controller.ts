import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { PrismaService } from 'src/prisma/prisma.service';
import { AttachmentService } from 'src/services/attachment.service';
import { CreateEntityAttachmentInput } from 'src/resolvers/attachment/dto/create-entity-attachment.input';
import { EntityService } from 'src/entity/entity.service';
import { ATTACHMENT_CACHE_DURATION } from 'src/constants';

@Controller('attachment')
export class AttachmentController {
  constructor(
    private prisma: PrismaService,
    private readonly attachmentService: AttachmentService,
    private readonly entityService: EntityService
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('entity-upload')
  @UseInterceptors(FilesInterceptor('attachments'))
  async uploadEntityAttachment(
    @Req() req,
    @UploadedFiles() attachments: Array<Express.Multer.File>,
    @Body() body: CreateEntityAttachmentInput
  ) {
    const user = req.user;
    await this.attachmentService.uploadSharepoint(user, attachments, body);
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
      'Cache-Control': `max-age=${ATTACHMENT_CACHE_DURATION}, public`,
    });
    res.end(fileData);
  }
}
