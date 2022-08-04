import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as http from 'http2';
import { extname } from 'path';
import * as qs from 'qs';
import { lastValueFrom, map } from 'rxjs';
import {
  connectionFromArraySlice,
  getPagingParameters,
} from 'src/common/pagination/connection-args';
import { EntityAttachmentConnectionArgs } from 'src/entity/dto/args/entity-attachment-connection.args';
import { EntityAttachment } from 'src/entity/dto/models/entity-attachment.model';
import { PaginatedEntityAttachment } from 'src/entity/dto/paginations/entity-attachment-connection.model';
import { MachineAttachmentConnectionArgs } from 'src/models/args/machine-attachment-connection.args';
import { TransportationAttachmentConnectionArgs } from 'src/models/args/transportation-attachment-connection.args';
import { MachineAttachment } from 'src/models/machine-attachment.model';
import { PaginatedMachineAttachment } from 'src/models/pagination/machine-attachment-connection.model';
import { PaginatedTransportationAttachment } from 'src/models/pagination/transportation-attachment-connection.model';
import { TransportationAttachment } from 'src/models/transportation-attachment.model';
import { User } from 'src/models/user.model';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisCacheService } from 'src/redisCache.service';

interface FileOptions {
  path?: string;
  name?: string;
}

@Injectable()
export class AttachmentService {
  private readonly logger = new Logger(AttachmentService.name);
  private readonly siteUrl = `https://${process.env.SP_URL}/sites/${process.env.SP_SITE_NAME}`;
  private readonly serverRelativeUrlToFolder = 'Shared Documents/Test';
  private readonly SP_TOKEN_KEY = 'SHAREPOINT_ACCESS_TOKEN';

  constructor(
    private prisma: PrismaService,
    private readonly redisCacheService: RedisCacheService,
    private readonly httpService: HttpService
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
    const url = `${this.siteUrl}/_api/web/getFolderByServerRelativeUrl('${this.serverRelativeUrlToFolder}${path}')/Files('${fileName}')/$value`;
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

  async getMachineAttachmentWithPagination(
    user: User,
    args: MachineAttachmentConnectionArgs
  ): Promise<PaginatedMachineAttachment> {
    const { limit, offset } = getPagingParameters(args);
    const limitPlusOne = limit + 1;
    const { search, machineId } = args;

    // eslint-disable-next-line prefer-const
    let where: any = { AND: [] };

    if (machineId) {
      where.AND.push({ machineId });
    }
    //for now these only
    if (search) {
      const or: any = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
      // If search contains all numbers, search the machine ids as well
      if (/^(0|[1-9]\d*)$/.test(search)) {
        or.push({ id: parseInt(search) });
      }
      where.AND.push({
        OR: or,
      });
    }
    const machineAttachment = await this.prisma.machineAttachment.findMany({
      skip: offset,
      take: limitPlusOne,
      where,
      include: { user: true },
      orderBy: { id: 'desc' },
    });

    const count = await this.prisma.machineAttachment.count({ where });
    const { edges, pageInfo } = connectionFromArraySlice(
      machineAttachment.slice(0, limit),
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

  async getTransportationAttachmentWithPagination(
    user: User,
    args: TransportationAttachmentConnectionArgs
  ): Promise<PaginatedTransportationAttachment> {
    const { limit, offset } = getPagingParameters(args);
    const limitPlusOne = limit + 1;
    const { search, transportationId } = args;

    // eslint-disable-next-line prefer-const
    let where: any = { AND: [] };

    if (transportationId) {
      where.AND.push({ transportationId });
    }
    //for now these only
    if (search) {
      const or: any = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
      // If search contains all numbers, search the transportation ids as well
      if (/^(0|[1-9]\d*)$/.test(search)) {
        or.push({ id: parseInt(search) });
      }
      where.AND.push({
        OR: or,
      });
    }
    const transportationAttachment =
      await this.prisma.transportationAttachment.findMany({
        skip: offset,
        take: limitPlusOne,
        where,
        include: { user: true },
        orderBy: { id: 'desc' },
      });

    const count = await this.prisma.transportationAttachment.count({ where });
    const { edges, pageInfo } = connectionFromArraySlice(
      transportationAttachment.slice(0, limit),
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

  async getMachineLatestAttachment(
    machineId: number
  ): Promise<MachineAttachment> {
    const machineAttachment = await this.prisma.machineAttachment.findFirst({
      where: {
        machineId,
        mimeType: 'image/jpeg',
      },
      orderBy: {
        id: 'desc',
      },
    });

    return machineAttachment;
  }

  async getTransportationLatestAttachment(
    transportationId: number
  ): Promise<TransportationAttachment> {
    const transportationAttachment =
      await this.prisma.transportationAttachment.findFirst({
        where: {
          transportationId,
          mimeType: 'image/jpeg',
        },
        orderBy: {
          id: 'desc',
        },
      });

    return transportationAttachment;
  }

  async getEntityLatestAttachment(entityId: number): Promise<EntityAttachment> {
    const entityAttachment = await this.prisma.entityAttachment.findFirst({
      where: {
        entityId,
      },
      orderBy: {
        id: 'desc',
      },
    });

    return entityAttachment;
  }

  async getEntityAttachmentWithPagination(
    user: User,
    args: EntityAttachmentConnectionArgs
  ): Promise<PaginatedEntityAttachment> {
    const { limit, offset } = getPagingParameters(args);
    const limitPlusOne = limit + 1;
    const { search, entityId } = args;

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
      // If search contains all numbers, search the transportation ids as well
      if (/^(0|[1-9]\d*)$/.test(search)) {
        or.push({ id: parseInt(search) });
      }
      where.AND.push({
        OR: or,
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
}
