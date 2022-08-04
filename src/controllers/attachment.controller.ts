import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateMachineAttachmentInput } from 'src/resolvers/attachment/dto/create-attachment.input';
import { AttachmentService } from 'src/services/attachment.service';
import { UserService } from 'src/services/user.service';
import * as moment from 'moment';
import { extname } from 'path';
import { MachineService } from 'src/services/machine.service';
import { CreateTransportationAttachmentInput } from 'src/resolvers/attachment/dto/create-transportation-attachment.input';
import { TransportationService } from 'src/services/transportation.service';
import { CreateEntityAttachmentInput } from 'src/resolvers/attachment/dto/create-entity-attachment.input';
import { EntityService } from 'src/entity/entity.service';

@Controller('attachment')
export class AttachmentController {
  constructor(
    private prisma: PrismaService,
    private readonly userService: UserService,
    private readonly attachmentService: AttachmentService,
    private readonly machineService: MachineService,
    private readonly transportationService: TransportationService,
    private readonly entityService: EntityService
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('machine-upload')
  @UseInterceptors(FileInterceptor('attachment'))
  async uploadMachineAttachment(
    @Req() req,
    @UploadedFile() attachment: Express.Multer.File,
    @Body() { machineId, description, isPublic }: CreateMachineAttachmentInput
  ) {
    const user = req.user;

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
      newAttachment = await this.prisma.machineAttachment.create({
        data: {
          userId: user.id,
          machineId: parseInt(machineId),
          description,
          mode,
          originalName: attachment.originalname,
          mimeType: attachment.mimetype,
          sharepointFileName,
        },
      });
      //add to history
      await this.machineService.createMachineHistoryInBackground({
        type: 'Add Attachment',
        description: `Added attachment (${newAttachment.id})`,
        machineId: parseInt(machineId),
        completedById: user.id,
      });
      try {
        await this.attachmentService.uploadFile(attachment, {
          name: sharepointFileName,
        });
      } catch (error) {
        if (newAttachment?.id) {
          await this.prisma.machineAttachment.delete({
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
  @Get('machine/:id')
  async viewMachineAttachment(@Req() req, @Param() params, @Res() res) {
    const user = req.user;
    const attachmentId = parseInt(params.id);
    const attachment = await this.prisma.machineAttachment.findFirst({
      where: { id: attachmentId },
    });
    if (!attachment) {
      throw new BadRequestException('Attachment does not exist.');
    }
    const file = await this.attachmentService.getFile(
      attachment.sharepointFileName
    );
    const fileData = file.data;
    res.set({
      'Content-Disposition': `inline; filename=${
        attachment.originalName ?? attachment.sharepointFileName
      }`,
      'Content-Type': attachment.mimeType ?? null,
    });
    res.end(fileData);
  }

  @UseGuards(JwtAuthGuard)
  @Post('transportation-upload')
  @UseInterceptors(FileInterceptor('attachment'))
  async uploadTransportAttachment(
    @Req() req,
    @UploadedFile() attachment: Express.Multer.File,
    @Body()
    {
      transportationId,
      description,
      isPublic,
    }: CreateTransportationAttachmentInput
  ) {
    const user = req.user;

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
      newAttachment = await this.prisma.transportationAttachment.create({
        data: {
          userId: user.id,
          transportationId: parseInt(transportationId),
          description,
          mode,
          originalName: attachment.originalname,
          mimeType: attachment.mimetype,
          sharepointFileName,
        },
      });
      try {
        //add to history
        await this.transportationService.createTransportationHistoryInBackground(
          {
            type: 'Add Attachment',
            description: `Added attachment (${newAttachment.id})`,
            transportationId: parseInt(transportationId),
            completedById: user.id,
          }
        );
        await this.attachmentService.uploadFile(attachment, {
          name: sharepointFileName,
        });
      } catch (error) {
        if (newAttachment?.id) {
          await this.prisma.transportationAttachment.delete({
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
  @Get('transportation/:id')
  async viewTransportationAttachment(@Req() req, @Param() params, @Res() res) {
    const user = req.user;
    const attachmentId = parseInt(params.id);
    const attachment = await this.prisma.transportationAttachment.findFirst({
      where: { id: attachmentId },
    });
    if (!attachment) {
      throw new BadRequestException('Attachment does not exist.');
    }
    const file = await this.attachmentService.getFile(
      attachment.sharepointFileName
    );
    const fileData = file.data;
    res.set({
      'Content-Disposition': `inline; filename=${
        attachment.originalName ?? attachment.sharepointFileName
      }`,
      'Content-Type': attachment.mimeType ?? null,
    });
    res.end(fileData);
  }

  @UseGuards(JwtAuthGuard)
  @Post('entity-upload')
  @UseInterceptors(FileInterceptor('attachment'))
  async uploadEntityAttachment(
    @Req() req,
    @UploadedFile() attachment: Express.Multer.File,
    @Body() { entityId, description, isPublic }: CreateEntityAttachmentInput
  ) {
    const user = req.user;

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
    const file = await this.attachmentService.getFile(
      attachment.sharepointFileName
    );
    const fileData = file.data;
    res.set({
      'Content-Disposition': `inline; filename=${
        attachment.originalName ?? attachment.sharepointFileName
      }`,
      'Content-Type': attachment.mimeType ?? null,
    });
    res.end(fileData);
  }
}
