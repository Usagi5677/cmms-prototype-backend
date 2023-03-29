import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { errorMessage } from 'src/common/helpers/errorMessage';
import {
  getPagingParameters,
  connectionFromArraySlice,
} from 'src/common/pagination/connection-args';
import { User } from 'src/models/user.model';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateEngineInput } from './dto/create-engine.input';
import { EngineConnectionArgs } from './dto/engine-connection.args';
import { PaginatedEngine } from './dto/engine-connection.model';
import { UpdateEngineInput } from './dto/update-engine.input';

@Injectable()
export class EngineService {
  constructor(private prisma: PrismaService) {}

  async create(user: User, { name, model, serial }: CreateEngineInput) {
    try {
      const existing = await this.prisma.engine.findFirst({
        where: { name, active: true },
      });
      if (existing) {
        throw new BadRequestException(`${name} already exists.`);
      }
      await this.prisma.engine.create({
        data: { name, model, serial, createdById: user.id },
      });
    } catch (e) {
      errorMessage({
        error: e,
        description: 'Unexpected while creating engine',
      });
    }
  }

  async findAll(args: EngineConnectionArgs): Promise<PaginatedEngine> {
    try {
      const { limit, offset } = getPagingParameters(args);
      const limitPlusOne = limit + 1;
      const { name } = args;
      const where: any = { AND: [{ active: true }] };
      if (name) {
        where.AND.push({ name: { contains: name, mode: 'insensitive' } });
      }
      const engines = await this.prisma.engine.findMany({
        skip: offset,
        take: limitPlusOne,
        where,
        orderBy: { name: 'asc' },
      });
      const count = await this.prisma.engine.count({ where });
      const { edges, pageInfo } = connectionFromArraySlice(
        engines.slice(0, limit),
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
      errorMessage({
        error: e,
        description: 'Unexpected error occured while loading engines',
      });
    }
  }

  async findOne(id: number) {
    try {
      const engine = await this.prisma.engine.findFirst({ where: { id } });
      if (!engine) {
        throw new BadRequestException('Invalid engine.');
      }
      return engine;
    } catch (e) {
      errorMessage({
        error: e,
        description: 'Unexpected error occured while loading engines',
      });
    }
  }

  async update({ id, name, model, serial }: UpdateEngineInput) {
    try {
      await this.prisma.engine.update({
        where: { id },
        data: { name, model, serial },
      });
    } catch (e) {
      errorMessage({
        error: e,
        description: 'Unexpected error occured while updating engine',
      });
    }
  }

  async remove(id: number) {
    try {
      await this.prisma.engine.update({
        where: { id },
        data: { active: false },
      });
    } catch (e) {
      errorMessage({
        error: e,
        description: 'Unexpected error occured while removing engine',
      });
    }
  }
}
