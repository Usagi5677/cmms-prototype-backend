import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import {
  connectionFromArraySlice,
  getPagingParameters,
} from 'src/common/pagination/connection-args';
import { User } from 'src/models/user.model';
import { CreateZoneInput } from './dto/create-zone.input';
import { UpdateZoneInput } from './dto/update-zone.input';
import { ZoneConnectionArgs } from './dto/zone-connection.args';
import { PaginatedZone } from './dto/zone-connection.model';

@Injectable()
export class ZoneService {
  constructor(private prisma: PrismaService) {}

  async create(user: User, { name }: CreateZoneInput) {
    const existing = await this.prisma.zone.findFirst({
      where: { name, active: true },
    });
    if (existing) {
      throw new BadRequestException(`${name} already exists.`);
    }
    await this.prisma.zone.create({ data: { name, createdById: user.id } });
  }

  async findAll(args: ZoneConnectionArgs): Promise<PaginatedZone> {
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
  }

  async findOne(id: number) {
    const zone = await this.prisma.zone.findFirst({ where: { id } });
    if (!zone) {
      throw new BadRequestException('Invalid zone.');
    }
    return zone;
  }

  async update({ id, name }: UpdateZoneInput) {
    await this.prisma.zone.update({ where: { id }, data: { name } });
  }

  async remove(id: number) {
    await this.prisma.zone.update({
      where: { id },
      data: { active: false },
    });
  }
}
