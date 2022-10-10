import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';
import {
  connectionFromArraySlice,
  getPagingParameters,
} from 'src/common/pagination/connection-args';
import { ENTITY_ASSIGNMENT_TYPES } from 'src/constants';
import { User } from 'src/models/user.model';
import { CreateDivisionInput } from './dto/create-division.input';
import { DivisionAssignConnectionArgs } from './dto/division-assign-connection.args';
import { DivisionAssignInput } from './dto/division-assign.input';
import { DivisionConnectionArgs } from './dto/division-connection.args';
import { PaginatedDivision } from './dto/division-connection.model';
import { UpdateDivisionInput } from './dto/update-division.input';

@Injectable()
export class DivisionService {
  constructor(private prisma: PrismaService) {}

  async create(user: User, { name }: CreateDivisionInput) {
    const existing = await this.prisma.division.findFirst({
      where: { name, active: true },
    });
    if (existing) {
      throw new BadRequestException(`${name} already exists.`);
    }
    await this.prisma.division.create({ data: { name, createdById: user.id } });
  }

  async findAll(args: DivisionConnectionArgs): Promise<PaginatedDivision> {
    const { limit, offset } = getPagingParameters(args);
    const limitPlusOne = limit + 1;
    const { name } = args;
    const where: any = { AND: [{ active: true }] };
    if (name) {
      where.AND.push({ name: { contains: name, mode: 'insensitive' } });
    }
    const divisions = await this.prisma.division.findMany({
      skip: offset,
      take: limitPlusOne,
      where,
      include: {
        assignees: {
          include: { user: true },
        },
      },
      orderBy: { name: 'asc' },
    });
    const count = await this.prisma.division.count({ where });
    const { edges, pageInfo } = connectionFromArraySlice(
      divisions.slice(0, limit),
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
    const division = await this.prisma.division.findFirst({ where: { id } });
    if (!division) {
      throw new BadRequestException('Invalid division.');
    }
    return division;
  }

  async update({ id, name }: UpdateDivisionInput) {
    await this.prisma.division.update({ where: { id }, data: { name } });
  }

  async remove(id: number) {
    await this.prisma.division.update({
      where: { id },
      data: { active: false },
    });
  }

  async assignUserToDivision({ divisionId, userIds }: DivisionAssignInput) {
    try {
      await this.prisma.divisionUsers.deleteMany({
        where: {
          divisionId: divisionId,
        },
      });
      if (userIds.length > 0) {
        await this.prisma.divisionUsers.createMany({
          data: userIds.map((userId) => ({
            divisionId,
            userId,
          })),
        });
      }
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        // This error throws if user is already assigned to entity
        // Catch and ignore this error and proceed
      } else {
        console.log(e);
        throw new InternalServerErrorException('Unexpected error occured.');
      }
    }
  }
}
