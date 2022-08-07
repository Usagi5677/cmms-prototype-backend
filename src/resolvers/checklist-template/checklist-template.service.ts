import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import * as moment from 'moment';
import { PrismaService } from 'nestjs-prisma';
import {
  connectionFromArraySlice,
  getPagingParameters,
} from 'src/common/pagination/connection-args';
import { CHECKLIST_TYPES } from 'src/constants';
import { ChecklistTemplateWithItems } from 'src/models/checklist-template-with-items.model';
import { ChecklistWithItems } from 'src/models/checklist-with-items.model';
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
        machinesDaily: true,
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
    entityId: number,
    newTemplateId: number
  ) {
    if (type === 'Daily') {
      await this.prisma.entity.update({
        where: { id: entityId },
        data: { dailyChecklistTemplateId: newTemplateId },
      });
    } else {
      await this.prisma.entity.update({
        where: { id: entityId },
        data: { weeklyChecklistTemplateId: newTemplateId },
      });
    }

    // Update existing checklists of entity
    await this.updateEntityChecklists(entityId, type);
  }

  async addItem(id: number, name: string, entityId?: number) {
    if (entityId) {
      const template = await this.prisma.checklistTemplate.findFirst({
        where: { id },
        include: { items: true },
      });
      if (template.name) {
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
          entityId,
          newUnnamedTemplate.id
        );
        return;
      }
    }
    const templateItem = await this.prisma.checklistTemplateItem.create({
      data: {
        checklistTemplateId: id,
        name,
      },
    });

    // Update all checklists using this template
    await this.updateChecklistOfAllEntitiesUsingTemplate(
      templateItem.checklistTemplateId
    );
  }

  async removeItem(id: number, templateId?: number, entityId?: number) {
    if (templateId && entityId) {
      const template = await this.prisma.checklistTemplate.findFirst({
        where: { id: templateId },
        include: { items: true },
      });
      if (template.name) {
        const entity = await this.prisma.entity.findFirst({
          where: { id: entityId },
        });
        if (!entity) {
          throw new BadRequestException('Invalid entity.');
        }
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
          entityId,
          newUnnamedTemplate.id
        );
        return;
      }
    }
    const templateItem = await this.prisma.checklistTemplateItem.delete({
      where: { id },
    });
    // Update all checklists using this template
    await this.updateChecklistOfAllEntitiesUsingTemplate(
      templateItem.checklistTemplateId
    );
  }

  async entityChecklistTemplate({
    entityId,
    type,
  }: EntityChecklistTemplateInput): Promise<ChecklistTemplateWithItems> {
    const entity = await this.prisma.entity.findFirst({
      where: { id: entityId },
    });
    // Validate checklist type
    let template: ChecklistTemplateWithItems = null;
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
      if (type === 'Daily') {
        await this.prisma.entity.update({
          where: { id: entityId },
          data: { dailyChecklistTemplateId: template.id },
        });
      } else {
        await this.prisma.entity.update({
          where: { id: entityId },
          data: { weeklyChecklistTemplateId: template.id },
        });
      }
    }
    return template;
  }

  async changeChecklistTemplate({
    entityId,
    newChecklistId,
  }: ChangeChecklistTemplateInput) {
    const entity = await this.prisma.entity.findFirst({
      where: { id: entityId },
    });

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
      transactions.push(
        this.prisma.entity.update({
          where: { id: entityId },
          data: { dailyChecklistTemplateId: newChecklistId },
        })
      );
    } else {
      currentTemplateId = entity.weeklyChecklistTemplateId;
      transactions.push(
        this.prisma.entity.update({
          where: { id: entityId },
          data: { weeklyChecklistTemplateId: newChecklistId },
        })
      );
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

    // Update existing checklists
    await this.updateEntityChecklists(entity.id, newChecklistTemplate.type);
  }

  async updateChecklistOfAllEntitiesUsingTemplate(templateId: number) {
    const template = await this.prisma.checklistTemplate.findFirst({
      where: { id: templateId },
      include: {
        machinesDaily: true,
        machinesWeekly: true,
        transportationsDaily: true,
        transportationsWeekly: true,
        entitiesDaily: true,
        entitiesWeekly: true,
      },
    });
    for (const machine of template.entitiesDaily) {
      await this.updateEntityChecklists(machine.id, 'Daily');
    }
    for (const machine of template.entitiesWeekly) {
      await this.updateEntityChecklists(machine.id, 'Weekly');
    }
    for (const transportation of template.entitiesDaily) {
      await this.updateEntityChecklists(transportation.id, 'Daily');
    }
    for (const transportation of template.entitiesWeekly) {
      await this.updateEntityChecklists(transportation.id, 'Weekly');
    }
  }

  // Update all checklists (after template is changed)
  async updateEntityChecklists(
    entityId: number,
    type: string,
    template?: ChecklistTemplateWithItems
  ) {
    if (!template) {
      template = await this.entityChecklistTemplate({
        entityId,
        type,
      });
    }
    const templateItems = template.items.map((i) => i.name);
    const startOf = type === 'Daily' ? 'day' : 'week';
    let checklistsToChange: ChecklistWithItems[] = [];
    checklistsToChange = await this.prisma.checklist.findMany({
      where: {
        entityId,
        from: { gte: moment().startOf(startOf).toDate() },
        type,
      },
      include: { items: true },
    });
    for (const checklist of checklistsToChange) {
      // const checklistItems = checklist.items.map((i) => i.description);
      const completedItems = checklist.items
        .filter((ci) => ci.completedAt !== null)
        .map((ci) => ci.description);
      const additions = templateItems.filter(
        (ti) => !completedItems.includes(ti)
      );
      await this.prisma.checklistItem.deleteMany({
        where: { checklistId: checklist.id, completedAt: null },
      });
      await this.prisma.checklistItem.createMany({
        data: additions.map((a) => ({
          checklistId: checklist.id,
          description: a,
        })),
      });
    }
  }
}
