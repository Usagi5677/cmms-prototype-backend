import { ObjectType } from '@nestjs/graphql';

@ObjectType()
class MachineDetail {
  id: number;
  machineNumber: string;
}

@ObjectType()
export class entityChecklistAndPMSummary {
  pm?: MachineDetail[];
  checklist?: MachineDetail[];
}
