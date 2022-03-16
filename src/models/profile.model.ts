import { ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Profile {
  userId: string;
  rcno: number;
  fullName: string;
  email?: string;
  telMobile?: number;
  telOffice?: number;
  telExtension?: number;
  post: string;
  division: string;
  department: string;
  section?: string;
  unit?: string;
}
