import { ObjectType } from '@nestjs/graphql';
import RelayTypes from '../../common/pagination/relay-types';
import { MachineSparePR } from '../machine-sparePR.model';

@ObjectType()
export class PaginatedMachineSparePR extends RelayTypes<MachineSparePR>(
  MachineSparePR
) {}
