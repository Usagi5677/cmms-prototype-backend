import { Field, Int, ObjectType } from '@nestjs/graphql';
import {
  Connection as RelayConnection,
  ConnectionCursor,
  Edge as RelayEdge,
} from './connection-args';

export interface Type<T = any> extends Function {
  new (...args: any[]): T;
}

const typeMap: any = {};
export default function RelayTypes<T>(type: Type<T>): any {
  const { name } = type;
  if (typeMap[`${name}`]) return typeMap[`${name}`];

  @ObjectType(`${name}Edge`, { isAbstract: true })
  class Edge implements RelayEdge<T> {
    public name = `${name}Edge`;

    @Field({ nullable: true })
    public cursor!: ConnectionCursor;

    @Field(() => type, { nullable: true })
    public node!: T;
  }

  @ObjectType(`${name}PageInfo`, { isAbstract: true })
  class PageInfo implements PageInfo {
    @Field({ nullable: true })
    public startCursor!: ConnectionCursor;

    @Field({ nullable: true })
    public endCursor!: ConnectionCursor;

    @Field(() => Int)
    public count!: number;

    @Field(() => Boolean)
    public hasPreviousPage!: boolean;

    @Field(() => Boolean)
    public hasNextPage!: boolean;
  }

  @ObjectType(`${name}Connection`, { isAbstract: true })
  class Connection implements RelayConnection<T> {
    public name = `${name}Connection`;

    @Field(() => [Edge], { nullable: true })
    public edges!: RelayEdge<T>[];

    @Field(() => PageInfo, { nullable: true })
    public pageInfo!: PageInfo;
  }

  typeMap[`${name}`] = Connection;
  return typeMap[`${name}`];
}
