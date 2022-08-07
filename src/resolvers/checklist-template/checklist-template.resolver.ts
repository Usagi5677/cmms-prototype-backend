import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { ChecklistTemplate } from 'src/models/checklist-template.model';
import { ChecklistTemplateService } from './checklist-template.service';
import { ChangeChecklistTemplateInput } from './dto/change-checklist-template.input';
import { ChecklistTemplateConnection } from './dto/checklist-template-connection.model';
import { ChecklistTemplateConnectionArgs } from './dto/checklist-template.connection.args';
import { CreateChecklistTemplateInput } from './dto/create-checklist-template.input';
import { EntityChecklistTemplateInput } from './dto/entity-checklist-template.input';
import { UpdateChecklistTemplateInput } from './dto/update-checklist-template.input';

@Resolver(() => ChecklistTemplate)
export class ChecklistTemplateResolver {
  constructor(
    private readonly checklistTemplateService: ChecklistTemplateService
  ) {}

  @Mutation(() => String)
  async createChecklistTemplate(
    @Args('createChecklistTemplateInput')
    createChecklistTemplateInput: CreateChecklistTemplateInput
  ) {
    await this.checklistTemplateService.create(createChecklistTemplateInput);
    return 'Successfully created checklist template.';
  }

  @Query(() => ChecklistTemplateConnection, { name: 'checklistTemplates' })
  async findAll(@Args() args: ChecklistTemplateConnectionArgs) {
    return await this.checklistTemplateService.findAll(args);
  }

  @Query(() => ChecklistTemplate, { name: 'checklistTemplate' })
  async findOne(@Args('id', { type: () => Int }) id: number) {
    return await this.checklistTemplateService.findOne(id);
  }

  @Mutation(() => String)
  async updateChecklistTemplate(
    @Args('updateChecklistTemplateInput')
    updateChecklistTemplateInput: UpdateChecklistTemplateInput
  ) {
    await this.checklistTemplateService.update(updateChecklistTemplateInput);
    return 'Successfully update checklist template.';
  }

  @Mutation(() => String)
  async removeChecklistTemplate(@Args('id', { type: () => Int }) id: number) {
    await this.checklistTemplateService.remove(id);
    return 'Successfully removed checklist template.';
  }

  @Mutation(() => String)
  async addChecklistTemplateItem(
    @Args('id', { type: () => Int }) id: number,
    @Args('name') name: string,
    @Args('entityId', { nullable: true }) entityId?: number
  ) {
    await this.checklistTemplateService.addItem(id, name, entityId);
    return 'Successfully added item to checklist template.';
  }

  @Mutation(() => String)
  async removeChecklistTemplateItem(
    @Args('id', { type: () => Int }) id: number,
    @Args('templateId', { nullable: true }) templateId?: number,
    @Args('entityId', { nullable: true }) entityId?: number
  ) {
    await this.checklistTemplateService.removeItem(id, templateId, entityId);
    return 'Successfully removed item from checklist template.';
  }

  @Query(() => ChecklistTemplate, { name: 'entityChecklistTemplate' })
  async entityChecklistTemplate(
    @Args('input', { type: () => EntityChecklistTemplateInput })
    input: EntityChecklistTemplateInput
  ) {
    return await this.checklistTemplateService.entityChecklistTemplate(input);
  }

  @Mutation(() => String)
  async changeChecklistTemplate(
    @Args('input', { type: () => ChangeChecklistTemplateInput })
    input: ChangeChecklistTemplateInput
  ) {
    await this.checklistTemplateService.changeChecklistTemplate(input);
    return 'Successfully changed checklist template.';
  }
}
