import { ArgsType, Field, Int } from '@nestjs/graphql';

export interface PageInfo {
  startCursor?: ConnectionCursor | null;
  endCursor?: ConnectionCursor | null;
  hasPreviousPage?: boolean | null;
  hasNextPage?: boolean | null;
}

export interface Edge<T> {
  node: T;
  cursor: ConnectionCursor;
}
export type ConnectionCursor = string;
export interface ConnectionArguments {
  before?: ConnectionCursor | null;
  after?: ConnectionCursor | null;
  first?: number | null;
  last?: number | null;
}

export interface ResolvedGlobalId {
  type: string;
  id: string;
}

export type Base64String = string;

export function base64(i: string): Base64String {
  return Buffer.from(i, 'utf8').toString('base64');
}

function unbase64(i: Base64String): string {
  return Buffer.from(i, 'base64').toString('utf8');
}

function fromGlobalId(globalId: string): ResolvedGlobalId {
  const unbasedGlobalId = unbase64(globalId);
  const delimiterPos = unbasedGlobalId.indexOf(':');
  return {
    type: unbasedGlobalId.substring(0, delimiterPos),
    id: unbasedGlobalId.substring(delimiterPos + 1),
  };
}

const getId = (cursor: ConnectionCursor) =>
  parseInt(fromGlobalId(cursor).id, 10);
const nextId = (cursor: ConnectionCursor) => getId(cursor) + 1;

type PagingMeta =
  | { pagingType: 'forward'; after?: string; first: number }
  | { pagingType: 'backward'; before?: string; last: number }
  | { pagingType: 'none' };

function checkPagingSanity(args: ConnectionArgs): PagingMeta {
  const { first = 0, last = 0, after, before } = args;

  const isForwardPaging = !!first || !!after;
  const isBackwardPaging = !!last || !!before;
  if (isForwardPaging && isBackwardPaging) {
    throw new Error('Relay pagination cannot be forwards AND backwards!');
  }
  if ((isForwardPaging && before) || (isBackwardPaging && after)) {
    throw new Error('Paging must use either first/after or last/before!');
  }
  if ((isForwardPaging && first < 0) || (isBackwardPaging && last < 0)) {
    throw new Error('Paging limit must be positive!');
  }
  if (last && !before) {
    throw new Error("When paging backwards, a 'before' argument is required!");
  }

  if (isForwardPaging) {
    return { pagingType: 'forward', after, first };
  }

  return isBackwardPaging
    ? { pagingType: 'backward', before, last }
    : { pagingType: 'none' };
}

interface PagingParams {
  offset?: number;
  limit?: number;
  filter?: unknown;
}

export function getPagingParameters(args: ConnectionArgs): PagingParams {
  const meta = checkPagingSanity(args);

  switch (meta.pagingType) {
    case 'forward': {
      return {
        limit: meta.first,
        offset: meta.after ? nextId(meta.after) : 0,
      };
    }
    case 'backward': {
      const { last, before } = meta;
      let limit = last;
      let offset = getId(before) - last;

      if (offset < 0) {
        limit = Math.max(last + offset, 0);
        offset = 0;
      }

      return { offset, limit };
    }
    default:
      return {};
  }
}

@ArgsType()
export default class ConnectionArgs implements ConnectionArguments {
  @Field({ nullable: true, description: 'Paginate before opaque cursor' })
  public before?: ConnectionCursor;

  @Field({ nullable: true, description: 'Paginate after opaque cursor' })
  public after?: ConnectionCursor;

  @Field(() => Int, { nullable: true, description: 'Paginate first' })
  public first?: number;

  @Field(() => Int, { nullable: true, description: 'Paginate last' })
  public last?: number;

  pagingParams(): PagingParams {
    return getPagingParameters(this);
  }
}
const PREFIX = 'arrayconnection:';
export function cursorToOffset(cursor: ConnectionCursor): number {
  return parseInt(unbase64(cursor).substring(PREFIX.length), 10);
}

export function offsetToCursor(offset: number): ConnectionCursor {
  return base64(PREFIX + offset);
}

export function getOffsetWithDefault(
  cursor: ConnectionCursor | null | void,
  defaultOffset: number
): number {
  if (typeof cursor !== 'string') {
    return defaultOffset;
  }
  const offset = cursorToOffset(cursor);
  return isNaN(offset) ? defaultOffset : offset;
}

export interface Connection<T> {
  edges: Array<Edge<T>>;
  pageInfo: PageInfo;
}

export interface Edge<T> {
  node: T;
  cursor: ConnectionCursor;
}

export interface ArraySliceMetaInfo {
  sliceStart: number;
  arrayLength: number;
}

export function connectionFromArraySlice<T>(
  arraySlice: ReadonlyArray<T>,
  args: ConnectionArguments,
  meta: ArraySliceMetaInfo
): Connection<T> {
  const { after, before, first, last } = args;
  const { sliceStart, arrayLength } = meta;
  const sliceEnd = sliceStart + arraySlice.length;
  const beforeOffset = getOffsetWithDefault(before, arrayLength);
  const afterOffset = getOffsetWithDefault(after, -1);

  let startOffset = Math.max(sliceStart - 1, afterOffset, -1) + 1;
  let endOffset = Math.min(sliceEnd, beforeOffset, arrayLength);
  if (typeof first === 'number') {
    if (first < 0) {
      throw new Error('Argument "first" must be a non-negative integer');
    }

    endOffset = Math.min(endOffset, startOffset + first);
  }
  if (typeof last === 'number') {
    if (last < 0) {
      throw new Error('Argument "last" must be a non-negative integer');
    }

    startOffset = Math.max(startOffset, endOffset - last);
  }

  // If supplied slice is too large, trim it down before mapping over it.
  const slice = arraySlice.slice(
    Math.max(startOffset - sliceStart, 0),
    arraySlice.length - (sliceEnd - endOffset)
  );

  const edges = slice.map((value, index) => ({
    cursor: offsetToCursor(startOffset + index),
    node: value,
  }));

  const firstEdge = edges[0];
  const lastEdge = edges[edges.length - 1];
  const lowerBound = after != null ? afterOffset + 1 : 0;
  const upperBound = before != null ? beforeOffset : arrayLength;
  return {
    edges,
    pageInfo: {
      startCursor: firstEdge ? firstEdge.cursor : null,
      endCursor: lastEdge ? lastEdge.cursor : null,
      hasPreviousPage:
        typeof last === 'number' ? startOffset > lowerBound : false,
      hasNextPage: typeof first === 'number' ? endOffset < upperBound : false,
    },
  };
}
