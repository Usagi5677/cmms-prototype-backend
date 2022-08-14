import { UseGuards } from '@nestjs/common';
import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UserEntity } from 'src/decorators/user.decorator';
import { GqlAuthGuard } from 'src/guards/gql-auth.guard';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { Permissions } from 'src/decorators/permissions.decorator';
import { ChecklistTemplate } from 'src/models/checklist-template.model';
import { User } from 'src/models/user.model';
import { ChecklistTemplateService } from './checklist-template.service';
import { ChangeChecklistTemplateInput } from './dto/change-checklist-template.input';
import { ChecklistTemplateConnection } from './dto/checklist-template-connection.model';
import { ChecklistTemplateConnectionArgs } from './dto/checklist-template.connection.args';
import { CreateChecklistTemplateInput } from './dto/create-checklist-template.input';
import { EntityChecklistTemplateInput } from './dto/entity-checklist-template.input';
import { UpdateChecklistTemplateInput } from './dto/update-checklist-template.input';

@UseGuards(GqlAuthGuard, PermissionsGuard)
@Resolver(() => ChecklistTemplate)
export class ChecklistTemplateResolver {
  constructor(
    private readonly checklistTemplateService: ChecklistTemplateService
  ) {}

  @Permissions('MODIFY_TEMPLATES')
  @Mutation(() => String)
  async createChecklistTemplate(
    @Args('createChecklistTemplateInput')
    createChecklistTemplateInput: CreateChecklistTemplateInput
  ) {
    await this.checklistTemplateService.create(createChecklistTemplateInput);
    return 'Successfully created checklist template.';
  }

  @Query(() => ChecklistTemplateConnection, { name: 'checklistTemplates' })
  async findAll(
    @UserEntity() user: User,
    @Args() args: ChecklistTemplateConnectionArgs
  ) {
    return await this.checklistTemplateService.findAll(user, args);
  }

  @Query(() => ChecklistTemplate, { name: 'checklistTemplate' })
  async findOne(@Args('id', { type: () => Int }) id: number) {
    return await this.checklistTemplateService.findOne(id);
  }

  @Mutation(() => String)
  async updateChecklistTemplate(
    @UserEntity() user: User,
    @Args('updateChecklistTemplateInput')
    updateChecklistTemplateInput: UpdateChecklistTemplateInput
  ) {
    await this.checklistTemplateService.update(
      user,
      updateChecklistTemplateInput
    );
    return 'Successfully update checklist template.';
  }

  @Permissions('MODIFY_TEMPLATES')
  @Mutation(() => String)
  async removeChecklistTemplate(@Args('id', { type: () => Int }) id: number) {
    await this.checklistTemplateService.remove(id);
    return 'Successfully removed checklist template.';
  }

  @Mutation(() => String)
  async addChecklistTemplateItem(
    @UserEntity() user: User,
    @Args('id', { type: () => Int }) id: number,
    @Args('name') name: string,
    @Args('entityId', { nullable: true }) entityId?: number
  ) {
    await this.checklistTemplateService.addItem(user, id, name, entityId);
    return 'Successfully added item to checklist template.';
  }

  @Mutation(() => String)
  async removeChecklistTemplateItem(
    @UserEntity() user: User,
    @Args('id', { type: () => Int }) id: number,
    @Args('templateId', { nullable: true }) templateId?: number,
    @Args('entityId', { nullable: true }) entityId?: number
  ) {
    await this.checklistTemplateService.removeItem(
      user,
      id,
      templateId,
      entityId
    );
    return 'Successfully removed item from checklist template.';
  }

  @Query(() => ChecklistTemplate, { name: 'entityChecklistTemplate' })
  async entityChecklistTemplate(
    @UserEntity() user: User,
    @Args('input', { type: () => EntityChecklistTemplateInput })
    input: EntityChecklistTemplateInput
  ) {
    return await this.checklistTemplateService.entityChecklistTemplate(
      input,
      user
    );
  }

  @Mutation(() => String)
  async changeChecklistTemplate(
    @UserEntity() user: User,
    @Args('input', { type: () => ChangeChecklistTemplateInput })
    input: ChangeChecklistTemplateInput
  ) {
    await this.checklistTemplateService.changeChecklistTemplate(user, input);
    return 'Successfully changed checklist template.';
  }

  @Mutation(() => String, {
    name: 'updateAllEntityChecklists',
    description:
      'Not to be called from frontend. Meant to be used when templates of entities are updated manually in the DB.',
  })
  async updateAllEntityChecklists() {
    await this.checklistTemplateService.updateAllEntityChecklists();
    return 'Successfully updated all entity checklists.';
  }
}
