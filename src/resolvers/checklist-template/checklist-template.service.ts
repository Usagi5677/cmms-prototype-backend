import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ChecklistTemplate, Machine, Transportation } from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';
import {
  connectionFromArraySlice,
  getPagingParameters,
} from 'src/common/pagination/connection-args';
import { CHECKLIST_TYPES } from 'src/constants';
import { ChangeChecklistTemplateInput } from './dto/change-checklist-template.input';
import { ChecklistTemplateConnection } from './dto/checklist-template-connection.model';
import { ChecklistTemplateConnectionArgs } from './dto/checklist-template.connection.args';
import { CreateChecklistTemplateInput } from './dto/create-checklist-template.input';
import { EntityChecklistTemplateInput } from './dto/entity-checklist-template.input';
import { UpdateChecklistTemplateInput } from './dto/update-checklist-template.input';

@Injectable()
export class ChecklistTemplateService {
  constructor(private prisma: PrismaService) {}
  async create({ name, type, items }: CreateChecklistTemplateInput) {
    if (!CHECKLIST_TYPES.includes(type)) {
      throw new BadRequestException('Invalid checklist template type.');
    }
    await this.prisma.checklistTemplate.create({
      data: {
        name,
        type,
        items: { createMany: { data: items.map((item) => ({ name: item })) } },
      },
    });
    return 'This action adds a new checklistTemplate';
  }

  async findAll(
    args: ChecklistTemplateConnectionArgs
  ): Promise<ChecklistTemplateConnection> {
    const { limit, offset } = getPagingParameters(args);
    const limitPlusOne = limit + 1;
    const { search, type } = args;
    const where: any = {
      name: { not: null },
    };
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }
    if (type) {
      where.type = type;
    }
    const templates = await this.prisma.checklistTemplate.findMany({
      skip: offset,
      take: limitPlusOne,
      where,
      orderBy: { updatedAt: 'desc' },
    });
    const count = await this.prisma.checklistTemplate.count({ where });
    const { edges, pageInfo } = connectionFromArraySlice(
      templates.slice(0, limit),
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
    return await this.prisma.checklistTemplate.findFirst({
      where: { id },
      include: {
        items: true,
        machinessDaily: true,
        machinesWeekly: true,
        transportationsDaily: true,
        transportationsWeekly: true,
      },
    });
  }

  async update({ id, name, type }: UpdateChecklistTemplateInput) {
    if (type && !CHECKLIST_TYPES.includes(type)) {
      throw new BadRequestException('Invalid checklist template type.');
    }
    await this.prisma.checklistTemplate.update({
      where: { id },
      data: { name, type },
    });
  }

  async remove(id: number) {
    await this.prisma.checklistTemplate.delete({ where: { id } });
  }

  async updateEntityTemplate(
    type: string,
    entityType: string,
    entityId: number,
    newTemplateId: number
  ) {
    if (type === 'Daily') {
      if (entityType === 'Transportation') {
        await this.prisma.transportation.update({
          where: { id: entityId },
          data: { dailyChecklistTemplateId: newTemplateId },
        });
      } else {
        await this.prisma.machine.update({
          where: { id: entityId },
          data: { dailyChecklistTemplateId: newTemplateId },
        });
      }
    } else {
      if (entityType === 'Transportation') {
        await this.prisma.transportation.update({
          where: { id: entityId },
          data: { weeklyChecklistTemplateId: newTemplateId },
        });
      } else {
        await this.prisma.machine.update({
          where: { id: entityId },
          data: { weeklyChecklistTemplateId: newTemplateId },
        });
      }
    }
  }

  async addItem(
    id: number,
    name: string,
    entityType?: string,
    entityId?: number
  ) {
    if (entityId && entityType) {
      const template = await this.prisma.checklistTemplate.findFirst({
        where: { id },
        include: { items: true },
      });
      if (template.name) {
        await this.validateEntity(entityType, entityId);
        const newUnnamedTemplate = await this.prisma.checklistTemplate.create({
          data: {
            type: template.type,
            items: {
              createMany: {
                data: [
                  ...template.items.map((item) => ({ name: item.name })),
                  { name },
                ],
              },
            },
          },
        });
        await this.updateEntityTemplate(
          template.type,
          entityType,
          entityId,
          newUnnamedTemplate.id
        );
        return;
      }
    }
    await this.prisma.checklistTemplateItem.create({
      data: {
        checklistTemplateId: id,
        name,
      },
    });
  }

  async removeItem(
    id: number,
    templateId?: number,
    entityType?: string,
    entityId?: number
  ) {
    if (templateId && entityId && entityType) {
      const template = await this.prisma.checklistTemplate.findFirst({
        where: { id: templateId },
        include: { items: true },
      });
      if (template.name) {
        await this.validateEntity(entityType, entityId);
        const newUnnamedTemplate = await this.prisma.checklistTemplate.create({
          data: {
            type: template.type,
            items: {
              createMany: {
                data: template.items
                  .filter((item) => item.id !== id)
                  .map((item) => ({ name: item.name })),
              },
            },
          },
          include: { items: true },
        });
        await this.updateEntityTemplate(
          template.type,
          entityType,
          entityId,
          newUnnamedTemplate.id
        );
        return;
      }
    }
    await this.prisma.checklistTemplateItem.delete({ where: { id } });
  }

  async validateEntity(
    entityType: string,
    entityId: number
  ): Promise<Machine | Transportation> {
    let entity: null | Transportation | Machine = null;
    // Validate entity type
    if (entityType === 'Transportation') {
      entity = await this.prisma.transportation.findFirst({
        where: { id: entityId },
      });
    } else if (entityType === 'Machine') {
      entity = await this.prisma.machine.findFirst({ where: { id: entityId } });
    } else {
      throw new BadRequestException('Invalid entity type.');
    }
    if (!entity) {
      throw new BadRequestException('Entity not found.');
    }
    return entity;
  }

  async entityChecklistTemplate({
    entityType,
    entityId,
    type,
  }: EntityChecklistTemplateInput): Promise<ChecklistTemplate> {
    const entity = await this.validateEntity(entityType, entityId);

    // Validate checklist type
    let template: ChecklistTemplate = null;
    if (type === 'Daily') {
      if (entity.dailyChecklistTemplateId) {
        template = await this.prisma.checklistTemplate.findFirst({
          where: { id: entity.dailyChecklistTemplateId },
          include: { items: true },
        });
      }
    } else if (type === 'Weekly') {
      if (entity.weeklyChecklistTemplateId) {
        template = await this.prisma.checklistTemplate.findFirst({
          where: { id: entity.weeklyChecklistTemplateId },
          include: { items: true },
        });
      }
    } else {
      throw new BadRequestException('Invalid checklist type.');
    }

    // If no existing template exists for the entity for the type, create an empty template
    if (!template) {
      template = await this.prisma.checklistTemplate.create({
        data: { type },
        include: { items: true },
      });
      if (entityType === 'Transportation') {
        if (type === 'Daily') {
          await this.prisma.transportation.update({
            where: { id: entityId },
            data: { dailyChecklistTemplateId: template.id },
          });
        } else {
          await this.prisma.transportation.update({
            where: { id: entityId },
            data: { weeklyChecklistTemplateId: template.id },
          });
        }
      } else {
        if (type === 'Daily') {
          await this.prisma.machine.update({
            where: { id: entityId },
            data: { dailyChecklistTemplateId: template.id },
          });
        } else {
          await this.prisma.machine.update({
            where: { id: entityId },
            data: { weeklyChecklistTemplateId: template.id },
          });
        }
      }
    }
    return template;
  }

  async changeChecklistTemplate({
    entityId,
    entityType,
    newChecklistId,
  }: ChangeChecklistTemplateInput) {
    const entity = await this.validateEntity(entityType, entityId);

    // Validate new checklist template
    const newChecklistTemplate = await this.prisma.checklistTemplate.findFirst({
      where: { id: newChecklistId },
    });
    if (!newChecklistTemplate) {
      throw new BadRequestException('Invalid checklist template.');
    }

    const transactions: any = [];
    let currentTemplateId = null;
    if (newChecklistTemplate.type === 'Daily') {
      currentTemplateId = entity.dailyChecklistTemplateId;
      if (entityType === 'Transportation') {
        transactions.push(
          this.prisma.transportation.update({
            where: { id: entityId },
            data: { dailyChecklistTemplateId: newChecklistId },
          })
        );
      } else {
        transactions.push(
          this.prisma.machine.update({
            where: { id: entityId },
            data: { dailyChecklistTemplateId: newChecklistId },
          })
        );
      }
    } else {
      currentTemplateId = entity.weeklyChecklistTemplateId;
      if (entityType === 'Transportation') {
        transactions.push(
          this.prisma.transportation.update({
            where: { id: entityId },
            data: { weeklyChecklistTemplateId: newChecklistId },
          })
        );
      } else {
        transactions.push(
          this.prisma.machine.update({
            where: { id: entityId },
            data: { weeklyChecklistTemplateId: newChecklistId },
          })
        );
      }
    }
    // Delete current template if it is not a named template
    if (currentTemplateId) {
      const currentTemplate = await this.prisma.checklistTemplate.findFirst({
        where: { id: currentTemplateId },
      });
      if (currentTemplate && !currentTemplate.name) {
        transactions.push(
          this.prisma.checklistTemplate.delete({
            where: { id: currentTemplateId },
          })
        );
      }
    }

    // Run transactions
    try {
      await this.prisma.$transaction(transactions);
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }
}
