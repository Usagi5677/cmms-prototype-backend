import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import {
  connectionFromArraySlice,
  getPagingParameters,
} from 'src/common/pagination/connection-args';
import { User } from 'src/models/user.model';
import { CreateLocationInput } from './dto/create-location.input';
import { LocationConnectionArgs } from './dto/location-connection.args';
import { PaginatedLocation } from './dto/location-connection.model';
import { UpdateLocationInput } from './dto/update-location.input';

@Injectable()
export class LocationService {
  constructor(private prisma: PrismaService) {}

  async create(user: User, { name }: CreateLocationInput) {
    const existing = await this.prisma.location.findFirst({
      where: { name, active: true },
    });
    if (existing) {
      throw new BadRequestException(`${name} already exists.`);
    }
    await this.prisma.location.create({ data: { name, createdById: user.id } });
  }

  async findAll(args: LocationConnectionArgs): Promise<PaginatedLocation> {
    const { limit, offset } = getPagingParameters(args);
    const limitPlusOne = limit + 1;
    const { name } = args;
    let where: any = { AND: [{ active: true }] };
    if (name) {
      where.AND.push({ name: { contains: name, mode: 'insensitive' } });
    }
    const locations = await this.prisma.location.findMany({
      skip: offset,
      take: limitPlusOne,
      where,
    });
    const count = await this.prisma.location.count({ where });
    const { edges, pageInfo } = connectionFromArraySlice(
      locations.slice(0, limit),
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
    const location = await this.prisma.location.findFirst({ where: { id } });
    if (!location) {
      throw new BadRequestException('Invalid location.');
    }
    return location;
  }

  async update({ id, name }: UpdateLocationInput) {
    await this.prisma.location.update({ where: { id }, data: { name } });
  }

  async remove(id: number) {
    await this.prisma.location.update({
      where: { id },
      data: { active: false },
    });
  }
}
