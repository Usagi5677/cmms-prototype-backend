import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  connectionFromArraySlice,
  getPagingParameters,
} from 'src/common/pagination/connection-args';
import { User } from 'src/models/user.model';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateZoneInput } from './dto/create-zone.input';
import { UpdateZoneInput } from './dto/update-zone.input';
import { ZoneConnectionArgs } from './dto/zone-connection.args';
import { PaginatedZone } from './dto/zone-connection.model';

@Injectable()
export class ZoneService {
  constructor(private prisma: PrismaService) {}

  async create(user: User, { name }: CreateZoneInput) {
    try {
      const existing = await this.prisma.zone.findFirst({
        where: { name, active: true },
      });
      if (existing) {
        throw new BadRequestException(`${name} already exists.`);
      }
      await this.prisma.zone.create({ data: { name, createdById: user.id } });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async findAll(args: ZoneConnectionArgs): Promise<PaginatedZone> {
    try {
      const { limit, offset } = getPagingParameters(args);
      const limitPlusOne = limit + 1;
      const { name } = args;
      const where: any = { AND: [{ active: true }] };
      if (name) {
        where.AND.push({ name: { contains: name, mode: 'insensitive' } });
      }
      const zones = await this.prisma.zone.findMany({
        skip: offset,
        take: limitPlusOne,
        where,
        orderBy: { name: 'asc' },
      });
      const count = await this.prisma.zone.count({ where });
      const { edges, pageInfo } = connectionFromArraySlice(
        zones.slice(0, limit),
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
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async findOne(id: number) {
    try {
      const zone = await this.prisma.zone.findFirst({ where: { id } });
      if (!zone) {
        throw new BadRequestException('Invalid zone.');
      }
      return zone;
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async update({ id, name }: UpdateZoneInput) {
    try {
      await this.prisma.zone.update({ where: { id }, data: { name } });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async remove(id: number) {
    try {
      await this.prisma.zone.update({
        where: { id },
        data: { active: false },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }
}
