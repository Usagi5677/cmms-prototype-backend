import { InternalServerErrorException } from '@nestjs/common';

//show exact error if it's available or show custom error msg
export async function errorMessage({
  error,
  description,
}: {
  error: any;
  description: string;
}) {
  console.log(error);
  if (error?.response) {
    throw new InternalServerErrorException(error?.response?.message);
  }
  throw new InternalServerErrorException(`${description}`);
}
