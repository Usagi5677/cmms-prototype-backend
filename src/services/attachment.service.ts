import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  Body,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UploadedFiles,
} from '@nestjs/common';
import * as http from 'http2';
import { extname } from 'path';
import * as qs from 'qs';
import { lastValueFrom, map } from 'rxjs';
import {
  connectionFromArraySlice,
  getPagingParameters,
} from 'src/common/pagination/connection-args';
import { COMPRESS_IF_GREATER, MAX_FILE_SIZE } from 'src/constants';
import { EntityAttachmentConnectionArgs } from 'src/entity/dto/args/entity-attachment-connection.args';
import { EntityAttachment } from 'src/entity/dto/models/entity-attachment.model';
import { PaginatedEntityAttachment } from 'src/entity/dto/paginations/entity-attachment-connection.model';
import { User } from 'src/models/user.model';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisCacheService } from 'src/redisCache.service';
import { CreateEntityAttachmentInput } from 'src/resolvers/attachment/dto/create-entity-attachment.input';
import * as sharp from 'sharp';
import * as moment from 'moment';
import { EntityService } from 'src/entity/entity.service';

interface FileOptions {
  path?: string;
  name?: string;
}

@Injectable()
export class AttachmentService {
  private readonly logger = new Logger(AttachmentService.name);
  private readonly siteUrl = `https://${process.env.SP_URL}/sites/${process.env.SP_SITE_NAME}`;
  private readonly serverRelativeUrlToFolder = `Shared Documents/${process.env.SP_FOLDER}`;
  private readonly SP_TOKEN_KEY = 'SHAREPOINT_ACCESS_TOKEN';

  constructor(
    private prisma: PrismaService,
    private readonly redisCacheService: RedisCacheService,
    private readonly httpService: HttpService,
    private readonly entityService: EntityService
  ) {}

  getInfo(document: Express.Multer.File) {
    return {
      ext: extname(document.originalname),
      size: document.size,
    };
  }

  // Ex: if /path/to/file.text => ['/path/to', 'file.txt']
  // returns [path, file]
  getFileNameAndPath(filePath: string) {
    const splitPath = filePath.split('/');
    return [
      splitPath.slice(0, splitPath.length - 1).join('/'),
      ...splitPath.slice(-1),
    ];
  }

  async getSharePointAccessToken(): Promise<string> {
    const spToken: string = await this.redisCacheService.get(this.SP_TOKEN_KEY);

    if (spToken) {
      return spToken;
    }

    const url = `https://accounts.accesscontrol.windows.net/${process.env.SP_TENANT_ID}/tokens/OAuth/2`;
    const CLIENT_ID = `${process.env.SP_CLIENT_ID}@${process.env.SP_TENANT_ID}`;
    const CLIENT_SECRET = `${process.env.SP_CLIENT_SECRET}`;
    const RESOURCE = `${process.env.SP_PRINCIPAL_ID}/${process.env.SP_URL}@${process.env.SP_TENANT_ID}`;
    const data = qs.stringify({
      grant_type: 'client_credentials',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      resource: RESOURCE,
    });

    try {
      const result = await lastValueFrom(
        this.httpService
          .post(url, data, {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          })
          .pipe(map((resp) => resp.data))
      );

      await this.redisCacheService.set(
        this.SP_TOKEN_KEY,
        result.access_token,
        result.expires_in
      );

      return result.access_token;
    } catch (e) {
      throw new InternalServerErrorException(e.message);
    }
  }

  async getFile(filePath: string) {
    const token = await this.getSharePointAccessToken();
    const [path, fileName] = this.getFileNameAndPath(filePath);
    const url = `${this.siteUrl}/_api/web/GetFileByServerRelativeUrl('/sites/${process.env.SP_SITE_NAME}/${this.serverRelativeUrlToFolder}${path}/${fileName}')/$value`;
    try {
      http;
      return await lastValueFrom(
        this.httpService.get(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          responseType: 'arraybuffer',
        })
      );
    } catch (e) {
      throw new NotFoundException('File not found');
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    { name, path = '' }: FileOptions
  ) {
    const fileNameWithExtension = name;
    this.logger.debug(
      `${new Date().toLocaleTimeString()} - Upload of file ${fileNameWithExtension} (${(
        file.size /
        1024 /
        1024
      ).toFixed(2)} MB) started...`
    );

    const url = `${this.siteUrl}/_api/web/getFolderByServerRelativeUrl('${this.serverRelativeUrlToFolder}${path}')/files/add(overwrite=true, url='${fileNameWithExtension}')`;

    const token = await this.getSharePointAccessToken();

    try {
      const result = await lastValueFrom(
        this.httpService
          .post(url, file.buffer, {
            headers: {
              Accept: 'application/json;odata=verbose',
              'Content-Length': `${file.size}`,
              Authorization: `Bearer ${token}`,
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
          })
          .pipe(map((resp) => resp.data))
      );

      if (result.error) {
        if (
          result.error.code ===
          '-2147024893, System.IO.DirectoryNotFoundException'
        ) {
          throw new NotFoundException('Folder not found');
        } else {
          this.logger.error('Result error', result.error);
          throw new InternalServerErrorException(
            'An error occurred uploading file'
          );
        }
      }
      this.logger.debug(
        `${new Date().toLocaleTimeString()} - Upload of file ${fileNameWithExtension} completed!`
      );

      return result;
    } catch (e) {
      console.log(e);
      this.logger.error('Thrown Error', e.response.data.error);
      throw new InternalServerErrorException(
        'An error occurred uploading file'
      );
    }
  }

  async deleteFile(fileName: string, path: string) {
    const token = await this.getSharePointAccessToken();
    const url = `${this.siteUrl}/_api/web/getFolderByServerRelativeUrl('${
      this.serverRelativeUrlToFolder
    }${path}${fileName
      .replace(new RegExp('/', 'g'), '_')
      .replace(new RegExp("'", 'g'), '')}')`;
    try {
      await lastValueFrom(
        this.httpService.post(url, undefined, {
          headers: {
            Accept: 'application/json;odata=verbose',
            'Content-Type': 'application/json;odata=verbose',
            'X-HTTP-Method': 'DELETE',
            'If-Match': '*',
            Authorization: `Bearer ${token}`,
          },
        })
      );
    } catch (e) {
      throw new NotFoundException('File not found');
    }
  }

  async getLatestFavouriteAttachment(
    entityId: number
  ): Promise<EntityAttachment> {
    const entityAttachment = await this.prisma.entityAttachment.findFirst({
      where: { entityId, favourite: true },
      orderBy: { id: 'desc' },
    });
    return entityAttachment;
  }

  async setFavouriteAttachment(id: number, flag: boolean) {
    try {
      const attachments = await this.prisma.entityAttachment.findMany({
        where: { favourite: true },
      });
      const attachmentIds = attachments?.map((a) => a.id);
      //remove all favourite
      await this.prisma.entityAttachment.updateMany({
        where: { id: { in: attachmentIds } },
        data: { favourite: false },
      });
      //update new favourite
      await this.prisma.entityAttachment.update({
        where: { id },
        data: flag ? { favourite: true } : { favourite: false },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async getEntityAttachmentWithPagination(
    user: User,
    args: EntityAttachmentConnectionArgs
  ): Promise<PaginatedEntityAttachment> {
    const { limit, offset } = getPagingParameters(args);
    const limitPlusOne = limit + 1;
    const { search, entityId, from, to } = args;
    const fromDate = moment(from).startOf('day');
    const toDate = moment(to).endOf('day');

    // eslint-disable-next-line prefer-const
    let where: any = { AND: [] };

    if (entityId) {
      where.AND.push({ entityId });
    }
    //for now these only
    if (search) {
      const or: any = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
      // If search contains all numbers, search ids as well
      if (/^(0|[1-9]\d*)$/.test(search)) {
        or.push({ id: parseInt(search) });
      }
      where.AND.push({
        OR: or,
      });
    }

    if (from && to) {
      where.AND.push({
        createdAt: { gte: fromDate.toDate(), lte: toDate.toDate() },
      });
    }

    const entityAttachment = await this.prisma.entityAttachment.findMany({
      skip: offset,
      take: limitPlusOne,
      where,
      include: { user: true },
      orderBy: { id: 'desc' },
    });

    const count = await this.prisma.entityAttachment.count({ where });
    const { edges, pageInfo } = connectionFromArraySlice(
      entityAttachment.slice(0, limit),
      args,
      {
        arrayLength: count,
        sliceStart: offset,
      }
    );
    return {
      edges,
      pageInfo: {
        ...pageInfo,
        count,
        hasNextPage: offset + limit < count,
        hasPreviousPage: offset >= limit,
      },
    };
  }

  async uploadSharepoint(
    user: User,
    @UploadedFiles() attachments: Array<Express.Multer.File>,
    @Body() { entityId, description, checklistId }: CreateEntityAttachmentInput
  ) {
    const compressedImages = [];
    for (const f of attachments) {
      // Only allow images to be uploaded to checklists
      if (checklistId && f.mimetype.substring(0, 6) !== 'image/') {
        console.log(f.mimetype.substring(0, 6));
        throw new BadRequestException('Not an image file.');
      }

      // Compress image if greater than
      if (f.size > COMPRESS_IF_GREATER) {
        try {
          const newBuffer = await sharp(f.buffer).resize(1000).toBuffer();
          f.buffer = newBuffer;
          f.size = Buffer.byteLength(newBuffer);
        } catch (e) {
          console.log(`Could not compress ${f.filename}: ${e}`);
        }
      }

      // Max allowed file size in bytes.
      if (f.size > MAX_FILE_SIZE) {
        throw new BadRequestException(
          'File size cannot be greater than 10 MB.'
        );
      }
      compressedImages.push(f);
    }

    for (const f of compressedImages) {
      const mode = 'Public';
      let newAttachment: any;
      const sharepointFileName = `${user.rcno}_${moment().unix()}${extname(
        f.originalname
      )}`;

      try {
        newAttachment = await this.prisma.entityAttachment.create({
          data: {
            userId: user.id,
            entityId: parseInt(entityId),
            description,
            mode,
            originalName: f.originalname,
            mimeType: f.mimetype,
            sharepointFileName,
            checklistId: parseInt(checklistId) ? parseInt(checklistId) : null,
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
          await this.uploadFile(f, {
            name: sharepointFileName,
          });
        } catch (error) {
          if (newAttachment?.id) {
            await this.prisma.entityAttachment.delete({
              where: { id: newAttachment.id },
            });
          }
          throw new InternalServerErrorException(
            'Error uploading to sharepoint.'
          );
        }
      } catch (error) {
        throw error;
      }
    }
  }
}
