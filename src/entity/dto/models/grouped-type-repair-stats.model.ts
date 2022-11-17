import { ObjectType } from '@nestjs/graphql';

@ObjectType()
export class GroupedTypeRepairStats {
  typeId?: number;
  name?: string;
  averageTimeOfRepair?: number;
  mean?: number;
  count?: number;
  total?: number;
}
