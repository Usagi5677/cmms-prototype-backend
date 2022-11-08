import { ObjectType } from '@nestjs/graphql';
import RelayTypes from '../../common/pagination/relay-types';
import { HullType } from '../entities/hull-type.entity';

@ObjectType()
export class PaginatedHullType extends RelayTypes<HullType>(HullType) {}
