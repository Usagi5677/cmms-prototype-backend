import { ObjectType } from '@nestjs/graphql';

@ObjectType()
export class userTypeCount {
  admin?: number;
  engineer?: number;
  technician?: number;
  user?: number;
  total?: number;
}
