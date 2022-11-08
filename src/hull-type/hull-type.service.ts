import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import {
  connectionFromArraySlice,
  getPagingParameters,
} from 'src/common/pagination/connection-args';
import { CreateHullTypeInput } from './dto/create-hull-type.input';
import { HullTypeConnectionArgs } from './dto/hull-type-connection.args';
import { PaginatedHullType } from './dto/hull-type-connection.model';
import { UpdateHullTypeInput } from './dto/update-hull-type.input';

@Injectable()
export class HullTypeService {
  constructor(private prisma: PrismaService) {}
  async create({ name }: CreateHullTypeInput) {
    const existing = await this.prisma.hullType.findFirst({
      where: { name, active: true },
    });
    if (existing) {
      throw new BadRequestException('This hull type already exists.');
    }
    await this.prisma.hullType.create({ data: { name } });
  }

  async findAll(args: HullTypeConnectionArgs): Promise<PaginatedHullType> {
    const { limit, offset } = getPagingParameters(args);
    const limitPlusOne = limit + 1;
    const { name } = args;
    const where: any = { AND: [{ active: true }] };
    if (name) {
      where.AND.push({ name: { contains: name, mode: 'insensitive' } });
    }
    const hullTypes = await this.prisma.hullType.findMany({
      skip: offset,
      take: limitPlusOne,
      where,
    });
    const count = await this.prisma.hullType.count({ where });
    const { edges, pageInfo } = connectionFromArraySlice(
      hullTypes.slice(0, limit),
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
    const hullType = await this.prisma.hullType.findFirst({ where: { id } });
    if (!hullType) {
      throw new BadRequestException('Invalid hull type.');
    }
    return hullType;
  }

  async update({ id, name }: UpdateHullTypeInput) {
    try {
      await this.prisma.hullType.update({
        where: { id },
        data: { name },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async remove(id: number) {
    try {
      await this.prisma.hullType.update({
        where: { id },
        data: { active: false },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }
}
