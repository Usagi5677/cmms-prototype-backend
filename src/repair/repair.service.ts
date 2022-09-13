import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import {
  connectionFromArraySlice,
  getPagingParameters,
} from 'src/common/pagination/connection-args';
import { User } from 'src/models/user.model';
import { RedisCacheService } from 'src/redisCache.service';
import { UserService } from 'src/services/user.service';
import { CreateRepairCommentInput } from './dto/create-repair-comment.input';
import { CreateRepairInput } from './dto/create-repair.input';
import { RepairConnectionArgs } from './dto/repair-connection.args';
import { PaginatedRepair } from './dto/repair-connection.model';
import { UpdateRepairInput } from './dto/update-repair.input';

@Injectable()
export class RepairService {
  constructor(
    private prisma: PrismaService,
    private userService: UserService,
    private readonly redisCacheService: RedisCacheService
  ) {}
  async create(user: User, { entityId, breakdownId, name }: CreateRepairInput) {
    try {
      await this.prisma.repair.create({
        data: {
          entityId,
          createdById: user.id,
          breakdownId,
          name,
        },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async findAll(
    user: User,
    args: RepairConnectionArgs
  ): Promise<PaginatedRepair> {
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
      const repair = await this.prisma.repair.findMany({
        skip: offset,
        take: limitPlusOne,
        where,
        include: {
          breakdown: {
            include: {
              createdBy: true,
            },
          },
          createdBy: true,
          comments: { include: { createdBy: true } },
        },
        orderBy: { id: 'desc' },
      });

      const count = await this.prisma.repair.count({ where });
      const { edges, pageInfo } = connectionFromArraySlice(
        repair.slice(0, limit),
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
      const repair = await this.prisma.repair.findFirst({
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
      return repair;
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async update(user: User, { id, name }: UpdateRepairInput) {
    try {
      await this.prisma.repair.update({
        where: { id },
        data: {
          name,
        },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async remove(user: User, id: number) {
    try {
      await this.prisma.repair.delete({ where: { id } });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async addRepairComment(
    user: User,
    { repairId, type, description }: CreateRepairCommentInput
  ) {
    try {
      await this.prisma.repairComment.create({
        data: {
          createdById: user.id,
          repairId,
          type,
          description,
        },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }
  async removeRepairComment(user: User, id: number) {
    try {
      await this.prisma.repairComment.delete({ where: { id } });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }
}
