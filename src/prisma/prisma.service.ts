import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super();
  }
  async onModuleInit() {
    // optional and better for performance, because of prisma client lazy connect behavior
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
