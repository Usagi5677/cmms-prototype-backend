import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import {
  connectionFromArraySlice,
  getPagingParameters,
} from 'src/common/pagination/connection-args';
import { CreateTypeInput } from './dto/create-type.input';
import { TypeConnectionArgs } from './dto/type-connection.args';
import { PaginatedType } from './dto/type-connection.model';
import { UpdateTypeInput } from './dto/update-type.input';

@Injectable()
export class TypeService {
  constructor(private prisma: PrismaService) {}

  async create({ entityType, name }: CreateTypeInput) {
    await this.prisma.type.create({ data: { entityType, name } });
  }

  async findAll(args: TypeConnectionArgs): Promise<PaginatedType> {
    const { limit, offset } = getPagingParameters(args);
    const limitPlusOne = limit + 1;
    const { name, entityType } = args;
    let where: any = { AND: [{ active: true }] };
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
  }

  async update({ id, entityType, name }: UpdateTypeInput) {
    await this.prisma.type.update({
      where: { id },
      data: { entityType, name },
    });
  }

  async remove(id: number) {
    await this.prisma.type.update({
      where: { id },
      data: { active: false },
    });
  }
}
