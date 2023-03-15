import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  connectionFromArraySlice,
  getPagingParameters,
} from 'src/common/pagination/connection-args';
import { User } from 'src/models/user.model';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateInterServiceColorInput } from './dto/create-inter-service-color.input';
import { InterServiceColorConnectionArgs } from './dto/inter-service-color-connection.args';
import { PaginatedInterServiceColor } from './dto/inter-service-color-connection.model';
import { UpdateInterServiceColorInput } from './dto/update-inter-service-color.input';

@Injectable()
export class InterServiceColorService {
  constructor(private prisma: PrismaService) {}
  async create(
    user: User,
    {
      typeId,
      brandId,
      measurement,
      greaterThan,
      lessThan,
    }: CreateInterServiceColorInput
  ) {
    try {
      const existing = await this.prisma.interServiceColor.findFirst({
        where: {
          typeId,
          brandId,
          measurement,
        },
      });
      if (existing) {
        throw new BadRequestException(
          'This inter service color already exists.'
        );
      }
      await this.prisma.interServiceColor.create({
        data: {
          typeId,
          brandId,
          measurement,
          greaterThan,
          lessThan,
          createdById: user.id,
        },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async findAll(
    args: InterServiceColorConnectionArgs
  ): Promise<PaginatedInterServiceColor> {
    try {
      const { limit, offset } = getPagingParameters(args);
      const limitPlusOne = limit + 1;
      const { name } = args;
      const where: any = { AND: [{ removedAt: null }] };
      if (name) {
        const or: any = [
          {
            type: {
              name: { contains: name, mode: 'insensitive' },
            },
          },
          {
            brand: {
              name: { contains: name, mode: 'insensitive' },
            },
          },
        ];
        where.AND.push({
          OR: or,
        });
      }
      const interServiceColors = await this.prisma.interServiceColor.findMany({
        skip: offset,
        take: limitPlusOne,
        where,
        include: { type: true, brand: true },
      });
      const count = await this.prisma.interServiceColor.count({ where });
      const { edges, pageInfo } = connectionFromArraySlice(
        interServiceColors.slice(0, limit),
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
      const interServiceColor = await this.prisma.interServiceColor.findFirst({
        where: { id },
      });
      if (!interServiceColor) {
        throw new BadRequestException('Invalid interService color.');
      }
      return interServiceColor;
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async update({
    id,
    typeId,
    brandId,
    measurement,
    greaterThan,
    lessThan,
  }: UpdateInterServiceColorInput) {
    try {
      const existing = await this.prisma.interServiceColor.findFirst({
        where: {
          typeId,
          brandId,
          measurement,
        },
      });

      if (
        existing &&
        existing?.typeId !== typeId &&
        existing?.brandId !== brandId &&
        existing?.measurement !== measurement &&
        existing?.greaterThan !== greaterThan &&
        existing?.lessThan !== lessThan
      ) {
        throw new BadRequestException(
          'This inter service color already exists.'
        );
      }
      await this.prisma.interServiceColor.update({
        where: { id },
        data: { typeId, brandId, measurement, greaterThan, lessThan },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException(e?.response?.message);
    }
  }

  async remove(id: number) {
    try {
      await this.prisma.interServiceColor.update({
        where: { id },
        data: { removedAt: new Date() },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }
}
