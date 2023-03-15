import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  connectionFromArraySlice,
  getPagingParameters,
} from 'src/common/pagination/connection-args';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateTypeInput } from './dto/create-type.input';
import { TypeConnectionArgs } from './dto/type-connection.args';
import { PaginatedType } from './dto/type-connection.model';
import { UpdateTypeInput } from './dto/update-type.input';

@Injectable()
export class TypeService {
  constructor(private prisma: PrismaService) {}

  async create({ entityType, name }: CreateTypeInput) {
    try {
      const existing = await this.prisma.type.findFirst({
        where: { name, entityType, active: true },
      });
      if (existing) {
        throw new BadRequestException('This type already exists.');
      }
      await this.prisma.type.create({ data: { entityType, name } });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async findAll(args: TypeConnectionArgs): Promise<PaginatedType> {
    try {
      const { limit, offset } = getPagingParameters(args);
      const limitPlusOne = limit + 1;
      const { name, entityType } = args;
      const where: any = { AND: [{ active: true }] };
      if (entityType) {
        where.AND.push({ entityType });
      }
      if (name) {
        where.AND.push({ name: { contains: name, mode: 'insensitive' } });
      }
      const types = await this.prisma.type.findMany({
        skip: offset,
        take: limitPlusOne,
        where,
      });
      const count = await this.prisma.type.count({ where });
      const { edges, pageInfo } = connectionFromArraySlice(
        types.slice(0, limit),
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

  async findEvery() {
    try {
      return await this.prisma.type.findMany({
        where: { active: true },
        orderBy: { name: 'asc' },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async findOne(id: number) {
    try {
      const type = await this.prisma.type.findFirst({ where: { id } });
      if (!type) {
        throw new BadRequestException('Invalid type.');
      }
      return type;
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async update({ id, entityType, name }: UpdateTypeInput) {
    try {
      await this.prisma.type.update({
        where: { id },
        data: { entityType, name },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async remove(id: number) {
    try {
      await this.prisma.type.update({
        where: { id },
        data: { active: false },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }
}
