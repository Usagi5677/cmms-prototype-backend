import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  connectionFromArraySlice,
  getPagingParameters,
} from 'src/common/pagination/connection-args';
import { User } from 'src/models/user.model';
import { PrismaService } from 'src/prisma/prisma.service';
import { BrandAssignInput } from './dto/brand-assign.input';
import { BrandConnectionArgs } from './dto/brand-connection.args';
import { PaginatedBrand } from './dto/brand-connection.model';
import { CreateBrandInput } from './dto/create-brand.input';
import { UpdateBrandInput } from './dto/update-brand.input';

@Injectable()
export class BrandService {
  constructor(private prisma: PrismaService) {}
  async create(user: User, { name }: CreateBrandInput) {
    const existing = await this.prisma.brand.findFirst({
      where: { name, active: true },
    });
    if (existing) {
      throw new BadRequestException('This brand already exists.');
    }
    await this.prisma.brand.create({ data: { name, createdById: user.id } });
  }

  async findAll(args: BrandConnectionArgs): Promise<PaginatedBrand> {
    const { limit, offset } = getPagingParameters(args);
    const limitPlusOne = limit + 1;
    const { name } = args;
    const where: any = { AND: [{ active: true }] };
    if (name) {
      where.AND.push({ name: { contains: name, mode: 'insensitive' } });
    }
    const brands = await this.prisma.brand.findMany({
      skip: offset,
      take: limitPlusOne,
      where,
    });
    const count = await this.prisma.brand.count({ where });
    const { edges, pageInfo } = connectionFromArraySlice(
      brands.slice(0, limit),
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
    const brand = await this.prisma.brand.findFirst({ where: { id } });
    if (!brand) {
      throw new BadRequestException('Invalid brand.');
    }
    return brand;
  }

  async update({ id, name }: UpdateBrandInput) {
    try {
      await this.prisma.brand.update({
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
      await this.prisma.brand.update({
        where: { id },
        data: { active: false },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async bulkAssignBrandToEntity(
    user: User,
    { brandId, entityIds }: BrandAssignInput
  ) {
    try {
      if (entityIds.length > 0) {
        await this.prisma.entity.updateMany({
          where: { id: { in: entityIds } },
          data: { brandId },
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
  async updateEntityBrand(user: User, entityId: number, brandId: number) {
    await this.prisma.entity.update({
      where: { id: entityId },
      data: { brandId },
    });
  }
}
