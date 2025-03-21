import { InjectQueue } from '@nestjs/bull';
import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Queue } from 'bull';
import * as moment from 'moment';
import {
  connectionFromArraySlice,
  getPagingParameters,
} from 'src/common/pagination/connection-args';
import { CHECKLIST_TYPES } from 'src/constants';
import { EntityService } from 'src/entity/entity.service';
import { ChecklistTemplateWithItems } from 'src/models/checklist-template-with-items.model';
import { ChecklistWithItems } from 'src/models/checklist-with-items.model';
import { User } from 'src/models/user.model';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserService } from 'src/services/user.service';
import { ChangeChecklistTemplateInput } from './dto/change-checklist-template.input';
import { ChecklistTemplateConnection } from './dto/checklist-template-connection.model';
import { ChecklistTemplateConnectionArgs } from './dto/checklist-template.connection.args';
import { CreateChecklistTemplateInput } from './dto/create-checklist-template.input';
import { EntityChecklistTemplateInput } from './dto/entity-checklist-template.input';
import { UpdateChecklistTemplateInput } from './dto/update-checklist-template.input';

export interface UpdateTaskInterface {
  checklistTemplateId: number;
  add: boolean;
}

@Injectable()
export class ChecklistTemplateService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => EntityService))
    private readonly entityService: EntityService,
    private readonly userService: UserService,
    @InjectQueue('cmms-update-task')
    private entityHistoryQueue: Queue
  ) {}
  async create({ name, type, items }: CreateChecklistTemplateInput) {
    try {
      if (!CHECKLIST_TYPES.includes(type)) {
        throw new BadRequestException('Invalid checklist template type.');
      }
      await this.prisma.checklistTemplate.create({
        data: {
          name,
          type,
          items: {
            createMany: { data: items.map((item) => ({ name: item })) },
          },
        },
      });
      return 'This action adds a new checklistTemplate';
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async findAll(
    user: User,
    args: ChecklistTemplateConnectionArgs
  ): Promise<ChecklistTemplateConnection> {
    try {
      const hasPermission = await this.userService.checkUserPermission(
        user.id,
        'VIEW_TEMPLATES',
        true
      );
      // If user does not have the permission, check if they are assigned as
      // admin to any entity.
      if (!hasPermission) {
        await this.entityService.checkAllEntityAssignments(user.id, ['Admin']);
      }
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
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async findOne(id: number) {
    try {
      return await this.prisma.checklistTemplate.findFirst({
        where: { id },
        include: {
          items: {
            where: { removedAt: null },
          },
          entitiesDaily: { include: { type: true } },
          entitiesWeekly: { include: { type: true } },
        },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async update(user: User, { id, name, type }: UpdateChecklistTemplateInput) {
    try {
      let isEntityAdmin = false;
      const checklistTemplate = await this.prisma.checklistTemplate.findFirst({
        where: { id },
      });
      if (checklistTemplate.name === null) {
        const entity = await this.prisma.entity.findFirst({
          where: {
            OR: [
              { weeklyChecklistTemplateId: id },
              { dailyChecklistTemplateId: id },
            ],
          },
        });
        if (entity) {
          await this.entityService.checkEntityAssignmentOrPermission(
            entity.id,
            user.id,
            entity,
            ['Admin'],
            ['MODIFY_TEMPLATES']
          );
          isEntityAdmin = true;
        }
      }
      if (!isEntityAdmin) {
        await this.userService.checkUserPermission(user.id, 'MODIFY_TEMPLATES');
      }
      if (type && !CHECKLIST_TYPES.includes(type)) {
        throw new BadRequestException('Invalid checklist template type.');
      }
      await this.prisma.checklistTemplate.update({
        where: { id },
        data: { name, type },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async remove(user: User, id: number) {
    try {
      const template = await this.prisma.checklistTemplate.findFirst({
        where: {
          id,
        },
        include: {
          entitiesDaily: true,
          entitiesWeekly: true,
        },
      });

      if (template.type === 'Daily') {
        for (const e of template?.entitiesDaily) {
          await this.entityService.createEntityHistoryInBackground({
            type: `Daily checklist template deleted`,
            description: `${user.fullName} (${user.rcno}) removed daily checklist template. ${template?.name} (${template.id}).`,
            entityId: e.id,
          });
        }
      }
      if (template.type === 'Weekly') {
        for (const e of template?.entitiesWeekly) {
          await this.entityService.createEntityHistoryInBackground({
            type: `Weekly checklist template deleted`,
            description: `${user.fullName} (${user.rcno}) removed weekly checklist template. ${template?.name} (${template.id}).`,
            entityId: e.id,
          });
        }
      }
      await this.prisma.checklistTemplate.delete({ where: { id } });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async updateEntityTemplate(
    type: string,
    entityId: number,
    newTemplateId: number
  ) {
    try {
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
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async addItem(user: User, id: number, name: string, entityId?: number) {
    try {
      if (entityId) {
        await this.entityService.checkEntityAssignmentOrPermission(
          entityId,
          user.id,
          undefined,
          ['Admin'],
          ['MODIFY_TEMPLATES']
        );
      } else {
        await this.userService.checkUserPermission(user.id, 'MODIFY_TEMPLATES');
      }
      if (entityId) {
        const template = await this.prisma.checklistTemplate.findFirst({
          where: { id },
          include: { items: { where: { removedAt: null } } },
        });
        if (template.name) {
          const newUnnamedTemplate = await this.prisma.checklistTemplate.create(
            {
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
            }
          );
          await this.updateEntityTemplate(
            template.type,
            entityId,
            newUnnamedTemplate.id
          );
          if (template.type === 'Daily') {
            await this.entityService.createEntityHistoryInBackground({
              type: `Unnamed daily checklist template item added`,
              description: `${user.fullName} (${user.rcno}) added daily item. ${name} (${newUnnamedTemplate.id}).`,
              entityId: entityId,
            });
          }
          if (template.type === 'Weekly') {
            await this.entityService.createEntityHistoryInBackground({
              type: `Unnamed weekly checklist template item added`,
              description: `${user.fullName} (${user.rcno}) added weekly item. ${name} (${newUnnamedTemplate.id}).`,
              entityId: entityId,
            });
          }

          return;
        }
      }
      const templateItem = await this.prisma.checklistTemplateItem.create({
        data: {
          checklistTemplateId: id,
          name,
        },
        include: {
          checklistTemplate: {
            include: { entitiesDaily: true, entitiesWeekly: true },
          },
        },
      });

      if (templateItem.checklistTemplate.type === 'Daily') {
        for (const e of templateItem.checklistTemplate.entitiesDaily) {
          await this.entityService.createEntityHistoryInBackground({
            type: `Daily checklist template item added`,
            description: `${user.fullName} (${user.rcno}) added daily checklist item. ${templateItem.name} (${templateItem.id}).`,
            entityId: e.id,
          });
        }
      }
      if (templateItem.checklistTemplate.type === 'Weekly') {
        for (const e of templateItem.checklistTemplate.entitiesWeekly) {
          await this.entityService.createEntityHistoryInBackground({
            type: `Weekly checklist template item added`,
            description: `${user.fullName} (${user.rcno}) added weekly checklist item. ${templateItem.name} (${templateItem.id}).`,
            entityId: e.id,
          });
        }
      }
      // Update all checklists using this template in background
      await this.updateTaskInBackground({
        checklistTemplateId: templateItem.checklistTemplateId,
        add: true,
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async removeItem(
    user: User,
    id: number,
    templateId?: number,
    entityId?: number
  ) {
    try {
      if (entityId) {
        await this.entityService.checkEntityAssignmentOrPermission(
          entityId,
          user.id,
          undefined,
          ['Admin'],
          ['MODIFY_TEMPLATES']
        );
      } else {
        await this.userService.checkUserPermission(user.id, 'MODIFY_TEMPLATES');
      }
      const template = await this.prisma.checklistTemplate.findFirst({
        where: { id: templateId },
        include: { items: { where: { removedAt: null } } },
      });
      if (templateId && entityId) {
        if (template.name) {
          const entity = await this.prisma.entity.findFirst({
            where: { id: entityId },
          });
          if (!entity) {
            throw new BadRequestException('Invalid entity.');
          }
          const newUnnamedTemplate = await this.prisma.checklistTemplate.create(
            {
              data: {
                type: template.type,
                items: {
                  createMany: {
                    data: template.items
                      .filter(async (item) => {
                        if (item.id !== id && template?.name == null) {
                          await this.prisma.checklistTemplateItem.update({
                            where: { id },
                            data: {
                              removedAt: new Date(),
                              removedById: user.id,
                            },
                          });
                        }
                        return item.id !== id;
                      })
                      .map((item) => ({ name: item.name })),
                  },
                },
              },
              include: {
                items: { where: { removedAt: null } },
                entitiesDaily: true,
                entitiesWeekly: true,
              },
            }
          );

          if (newUnnamedTemplate.type === 'Daily') {
            for (const e of newUnnamedTemplate?.entitiesDaily) {
              await this.entityService.createEntityHistoryInBackground({
                type: `Daily checklist template item removed`,
                description: `${user.fullName} (${user.rcno}) removed daily checklist item. ${template.name} (${template.id}).`,
                entityId: e.id,
              });
            }
          }
          if (newUnnamedTemplate.type === 'Weekly') {
            for (const e of newUnnamedTemplate?.entitiesWeekly) {
              await this.entityService.createEntityHistoryInBackground({
                type: `Weekly checklist template item removed`,
                description: `${user.fullName} (${user.rcno}) removed weekly checklist item. ${template.name} (${template.id}).`,
                entityId: e.id,
              });
            }
          }
          await this.updateEntityTemplate(
            template.type,
            entityId,
            newUnnamedTemplate.id
          );
          return;
        }
      }

      const templateItem = await this.prisma.checklistTemplateItem.update({
        where: { id },
        data: { removedAt: new Date(), removedById: user.id },
        include: {
          checklistTemplate: {
            include: {
              entitiesDaily: true,
              entitiesWeekly: true,
            },
          },
        },
      });

      if (templateItem.checklistTemplate.type === 'Daily') {
        for (const e of templateItem.checklistTemplate.entitiesDaily) {
          await this.entityService.createEntityHistoryInBackground({
            type: `Daily checklist template item removed`,
            description: `${user.fullName} (${user.rcno}) removed daily checklist item. ${templateItem.name} (${templateItem.id}).`,
            entityId: e.id,
          });
        }
      }
      if (templateItem.checklistTemplate.type === 'Weekly') {
        for (const e of templateItem.checklistTemplate.entitiesWeekly) {
          await this.entityService.createEntityHistoryInBackground({
            type: `Weekly checklist template item removed`,
            description: `${user.fullName} (${user.rcno}) removed weekly checklist item. ${templateItem.name} (${templateItem.id}).`,
            entityId: e.id,
          });
        }
      }

      // Update all checklists using this template in background
      await this.updateTaskInBackground({
        checklistTemplateId: templateItem.checklistTemplateId,
        add: false,
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async entityChecklistTemplate(
    { entityId, type }: EntityChecklistTemplateInput,
    user?: User
  ): Promise<ChecklistTemplateWithItems> {
    try {
      const entity = await this.prisma.entity.findFirst({
        where: { id: entityId },
      });
      if (user) {
        await this.entityService.checkEntityAssignmentOrPermission(
          entityId,
          user.id,
          entity,
          ['Admin', 'Engineer', 'User'],
          ['VIEW_TEMPLATES']
        );
      }
      // Validate checklist type
      let template: ChecklistTemplateWithItems = null;
      if (type === 'Daily') {
        if (entity.dailyChecklistTemplateId) {
          template = await this.prisma.checklistTemplate.findFirst({
            where: { id: entity.dailyChecklistTemplateId },
            include: { items: { where: { removedAt: null } } },
          });
        }
      } else if (type === 'Weekly') {
        if (entity.weeklyChecklistTemplateId) {
          template = await this.prisma.checklistTemplate.findFirst({
            where: { id: entity.weeklyChecklistTemplateId },
            include: { items: { where: { removedAt: null } } },
          });
        }
      } else {
        throw new BadRequestException('Invalid checklist type.');
      }

      // If no existing template exists for the entity for the type, create an empty template
      if (!template) {
        template = await this.prisma.checklistTemplate.create({
          data: { type },
          include: { items: { where: { removedAt: null } } },
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
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async changeChecklistTemplate(
    user: User,
    { entityId, newChecklistId }: ChangeChecklistTemplateInput
  ) {
    try {
      const entity = await this.prisma.entity.findFirst({
        where: { id: entityId },
      });
      await this.entityService.checkEntityAssignmentOrPermission(
        entityId,
        user.id,
        entity,
        ['Admin'],
        ['MODIFY_TEMPLATES']
      );
      // Validate new checklist template
      const newChecklistTemplate =
        await this.prisma.checklistTemplate.findFirst({
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
        await this.entityService.createEntityHistoryInBackground({
          type: `Daily checklist template assigned`,
          description: `${user.fullName} (${user.rcno}) assigned daily checklist template. ${newChecklistTemplate?.name} (${newChecklistTemplate.id}).`,
          entityId: entityId,
        });
      } else {
        currentTemplateId = entity.weeklyChecklistTemplateId;
        transactions.push(
          this.prisma.entity.update({
            where: { id: entityId },
            data: { weeklyChecklistTemplateId: newChecklistId },
          })
        );
        await this.entityService.createEntityHistoryInBackground({
          type: `Weekly checklist template assigned`,
          description: `${user.fullName} (${user.rcno}) assigned weekly checklist template. ${newChecklistTemplate?.name} (${newChecklistTemplate.id}).`,
          entityId: entityId,
        });
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
      await this.prisma.$transaction(transactions);
      // Update existing checklists
      await this.updateEntityChecklists(entity.id, newChecklistTemplate.type);
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async updateChecklistOfAllEntitiesUsingTemplate(
    updateTask: UpdateTaskInterface
  ) {
    try {
      const template = await this.prisma.checklistTemplate.findFirst({
        where: { id: updateTask.checklistTemplateId },
        include: {
          entitiesDaily: true,
          entitiesWeekly: true,
          items: true,
        },
      });
      for (const entity of template.entitiesDaily) {
        await this.updateEntityChecklists(entity.id, 'Daily');
      }
      for (const entity of template.entitiesWeekly) {
        await this.updateEntityChecklists(entity.id, 'Weekly');
      }
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  // Update all checklists (after template is changed)
  async updateEntityChecklists(
    entityId: number,
    type: string,
    template?: ChecklistTemplateWithItems
  ) {
    try {
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
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async updateAllEntityChecklists() {
    try {
      const checkStatus = ['Working', 'Critical'];
      const allEntities = await this.prisma.entity.findMany({
        where: { status: { in: checkStatus } },
      });
      for (const entity of allEntities) {
        await this.updateEntityChecklists(entity.id, 'Daily');
        await this.updateEntityChecklists(entity.id, 'Weekly');
      }
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Update task in all entity in background */
  async updateTaskInBackground(updateTask: UpdateTaskInterface) {
    try {
      await this.entityHistoryQueue.add('updateTask', {
        updateTask,
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  async bulkAssignChecklistTemplate(
    user: User,
    entityIds: number[],
    newChecklistId: number
  ) {
    try {
      for (const e of entityIds) {
        const entity = await this.prisma.entity.findFirst({
          where: { id: e },
        });
        await this.entityService.checkEntityAssignmentOrPermission(
          e,
          user.id,
          entity,
          ['Admin'],
          ['MODIFY_TEMPLATES']
        );
      }

      for (const e of entityIds) {
        const entity = await this.prisma.entity.findFirst({
          where: { id: e },
        });
        // Validate new checklist template
        const newChecklistTemplate =
          await this.prisma.checklistTemplate.findFirst({
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
              where: { id: e },
              data: { dailyChecklistTemplateId: newChecklistId },
            })
          );
          await this.entityService.createEntityHistoryInBackground({
            type: `Daily checklist template assigned`,
            description: `${user.fullName} (${user.rcno}) assigned daily checklist template. ${newChecklistTemplate?.name} (${newChecklistTemplate.id}).`,
            entityId: e,
          });
        } else {
          currentTemplateId = entity.weeklyChecklistTemplateId;
          transactions.push(
            this.prisma.entity.update({
              where: { id: e },
              data: { weeklyChecklistTemplateId: newChecklistId },
            })
          );
          await this.entityService.createEntityHistoryInBackground({
            type: `Weekly checklist template assigned`,
            description: `${user.fullName} (${user.rcno}) assigned weekly checklist template. ${newChecklistTemplate?.name} (${newChecklistTemplate.id}).`,
            entityId: e,
          });
        }
        // Delete current template if it is not a named template
        if (currentTemplateId) {
          const currentTemplate = await this.prisma.checklistTemplate.findFirst(
            {
              where: { id: currentTemplateId },
            }
          );
          if (currentTemplate && !currentTemplate.name) {
            transactions.push(
              this.prisma.checklistTemplate.delete({
                where: { id: currentTemplateId },
              })
            );
          }
        }

        // Run transactions
        await this.prisma.$transaction(transactions);

        // Update existing checklists
        await this.updateEntityChecklists(entity.id, newChecklistTemplate.type);
      }
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }
}
