import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { Entity } from './entities/entity.entity';

@Injectable()
export class EntityService {
  constructor(private prisma: PrismaService) {}

  async search(query: string, limit?: number): Promise<Entity[]> {
    if (!limit) limit = 10;
    const entities: Entity[] = [];
    const machines = await this.prisma.machine.findMany({
      where: { machineNumber: { contains: query, mode: 'insensitive' } },
      take: Math.round(limit / 2),
    });
    const transports = await this.prisma.transportation.findMany({
      where: {
        machineNumber: { contains: query, mode: 'insensitive' },
      },
      take: Math.round(limit / 2),
    });
    for (const machine of machines) {
      entities.push({
        entityId: machine.id,
        entityType: 'Machine',
        entityNo: machine.machineNumber,
        machine: machine,
      });
    }
    for (const transport of transports) {
      entities.push({
        entityId: transport.id,
        entityType: 'Transportation',
        entityNo: transport.machineNumber,
        transportation: transport,
        transportationType: transport.transportType,
      });
    }
    return entities;
  }
}
