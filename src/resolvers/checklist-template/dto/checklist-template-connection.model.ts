import { ObjectType } from '@nestjs/graphql';
import RelayTypes from 'src/common/pagination/relay-types';
import { ChecklistTemplate } from 'src/models/checklist-template.model';

@ObjectType()
export class ChecklistTemplateConnection extends RelayTypes<ChecklistTemplate>(
  ChecklistTemplate
) {}
