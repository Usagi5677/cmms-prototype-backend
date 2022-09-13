import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import {
  connectionFromArraySlice,
  getPagingParameters,
} from 'src/common/pagination/connection-args';
import { User } from 'src/models/user.model';
import { RedisCacheService } from 'src/redisCache.service';
import { UserService } from 'src/services/user.service';
import { BreakdownConnectionArgs } from './dto/breakdown-connection.args';
import { PaginatedBreakdown } from './dto/breakdown-connection.model';
import { CreateBreakdownCommentInput } from './dto/create-breakdown-comment.input';
import { CreateBreakdownDetailInput } from './dto/create-breakdown-detail.input';
import { CreateBreakdownInput } from './dto/create-breakdown.input';
import { UpdateBreakdownInput } from './dto/update-breakdown.input';

@Injectable()
export class BreakdownService {
  constructor(
    private prisma: PrismaService,
    private userService: UserService,
    private readonly redisCacheService: RedisCacheService
  ) {}
  async create(
    user: User,
    { entityId, name, type, estimatedDateOfRepair }: CreateBreakdownInput
  ) {
    try {
      await this.prisma.breakdown.create({
        data: {
          entityId,
          createdById: user.id,
          name,
          type,
          estimatedDateOfRepair,
        },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async findAll(
    user: User,
    args: BreakdownConnectionArgs
  ): Promise<PaginatedBreakdown> {
    try {
      const { limit, offset } = getPagingParameters(args);
      const limitPlusOne = limit + 1;
      const { entityId, search } = args;

      // eslint-disable-next-line prefer-const
      let where: any = { AND: [] };
      if (entityId) {
        where.AND.push({ entityId });
      }
      //for now these only
      if (search) {
        const or: any = [{ name: { contains: search, mode: 'insensitive' } }];
        // If search contains all numbers, search the machine ids as well
        if (/^(0|[1-9]\d*)$/.test(search)) {
          or.push({ id: parseInt(search) });
        }
        where.AND.push({
          OR: or,
        });
      }
      const breakdown = await this.prisma.breakdown.findMany({
        skip: offset,
        take: limitPlusOne,
        where,
        include: {
          createdBy: true,
          comments: {
            where: { type: 'Observation' },
            include: {
              createdBy: true,
            },
          },
          details: {
            include: {
              createdBy: true,
              comments: {
                include: { createdBy: true },
              },
            },
          },
          repairs: {
            include: {
              comments: { include: { createdBy: true } },
              createdBy: true,
            },
          },
        },
        orderBy: { id: 'desc' },
      });

      const count = await this.prisma.breakdown.count({ where });
      const { edges, pageInfo } = connectionFromArraySlice(
        breakdown.slice(0, limit),
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
      const breakdown = await this.prisma.breakdown.findFirst({
        where: { id },
        include: {
          comments: {
            include: {
              createdBy: true,
            },
            orderBy: { id: 'desc' },
          },
        },
      });
      return breakdown;
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async update(
    user: User,
    { id, entityId, name, type, estimatedDateOfRepair }: UpdateBreakdownInput
  ) {
    try {
      await this.prisma.breakdown.update({
        where: { id },
        data: {
          entityId,
          name,
          type,
          estimatedDateOfRepair,
        },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async remove(user: User, id: number) {
    try {
      await this.prisma.breakdown.delete({ where: { id } });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async addBreakdownComment(
    user: User,
    { breakdownId, detailId, type, description }: CreateBreakdownCommentInput
  ) {
    try {
      await this.prisma.breakdownComment.create({
        data: {
          createdById: user.id,
          breakdownId,
          detailId,
          type,
          description,
        },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }
  async removeBreakdownComment(user: User, id: number) {
    try {
      await this.prisma.breakdownComment.delete({ where: { id } });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async addBreakdownDetail(
    user: User,
    { breakdownId, description }: CreateBreakdownDetailInput
  ) {
    try {
      await this.prisma.breakdownDetail.create({
        data: {
          createdById: user.id,
          breakdownId,
          description,
        },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }
  async removeBreakdownDetail(user: User, id: number) {
    try {
      await this.prisma.breakdownDetail.delete({ where: { id } });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }
}
