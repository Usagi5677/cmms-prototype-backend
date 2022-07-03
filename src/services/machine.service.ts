import { PrismaService } from 'nestjs-prisma';
import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { RedisCacheService } from 'src/redisCache.service';
import {
  connectionFromArraySlice,
  getPagingParameters,
} from 'src/common/pagination/connection-args';
import { UserService } from './user.service';
import { NotificationService } from './notification.service';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { PUB_SUB } from 'src/resolvers/pubsub/pubsub.module';
import { ConfigService } from '@nestjs/config';
import { MachineConnectionArgs } from 'src/models/args/machine-connection.args';
import { PaginatedMachine } from 'src/models/pagination/machine-connection.model';
import { PeriodicMaintenanceStatus } from 'src/common/enums/periodicMaintenanceStatus';
import { RepairStatus } from 'src/common/enums/repairStatus';
import { BreakdownStatus } from 'src/common/enums/breakdownStatus';
import { MachineRepairConnectionArgs } from 'src/models/args/machine-repair-connection.args';
import { PaginatedMachineRepair } from 'src/models/pagination/machine-repair-connection.model';
import { MachineBreakdownConnectionArgs } from 'src/models/args/machine-breakdown-connection.args';
import { PaginatedMachineBreakdown } from 'src/models/pagination/machine-breakdown-connection.model';
import { MachineSparePRConnectionArgs } from 'src/models/args/machine-sparePR-connection.args';
import { PaginatedMachineSparePR } from 'src/models/pagination/machine-sparePR-connection.model';
import { MachineStatus } from 'src/common/enums/machineStatus';
import { PaginatedMachinePeriodicMaintenance } from 'src/models/pagination/machine-periodic-maintenance-connection.model';
import { MachinePeriodicMaintenanceConnectionArgs } from 'src/models/args/machine-periodic-maintenance-connection.args';
import { MachineHistoryConnectionArgs } from 'src/models/args/machine-history-connection.args';
import { PaginatedMachineHistory } from 'src/models/pagination/machine-history-connection.model';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import * as moment from 'moment';
import { SparePRStatus } from 'src/common/enums/sparePRStatus';
import { Machine } from 'src/models/machine.model';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ChecklistItem } from 'src/models/checklist-item.model';

export interface MachineHistoryInterface {
  machineId: number;
  type: string;
  description: string;
  completedById?: number;
  machineStatus?: MachineStatus;
  machineType?: string;
  workingHour?: number;
  idleHour?: number;
  breakdownHour?: number;
  location?: string;
}

@Injectable()
export class MachineService {
  constructor(
    private prisma: PrismaService,
    private userService: UserService,
    private readonly redisCacheService: RedisCacheService,
    private readonly notificationService: NotificationService,
    @InjectQueue('cmms-machine-history') private machineHistoryQueue: Queue,
    @Inject(PUB_SUB) private readonly pubSub: RedisPubSub,
    private configService: ConfigService
  ) {}

  //** Create machine. */
  async createMachine(
    user: User,
    machineNumber: string,
    model: string,
    type: string,
    zone: string,
    location: string,
    currentRunning: number,
    lastService: number,
    registeredDate?: Date,
    measurement?: string
  ) {
    try {
      const interService = currentRunning - lastService;
      const machine = await this.prisma.machine.create({
        data: {
          createdById: user.id,
          machineNumber,
          model,
          type,
          zone,
          location,
          currentRunning,
          lastService,
          interService,
          registeredDate,
          measurement,
        },
      });

      await this.createMachineHistoryInBackground({
        type: 'Machine Add',
        description: `Machine created`,
        machineId: machine.id,
        completedById: user.id,
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Delete machine. */
  async deleteMachine(id: number, user: User) {
    try {
      const machineUsers = await this.getMachineUserIds(id, user.id);
      for (let index = 0; index < machineUsers.length; index++) {
        await this.notificationService.createInBackground({
          userId: machineUsers[index],
          body: `${user.fullName} (${user.rcno}) deleted machine (${id})}`,
          link: `/machine/${id}`,
        });
      }
      await this.prisma.machine.update({
        where: { id },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Edit machine */
  async editMachine(
    id: number,
    machineNumber: string,
    model: string,
    type: string,
    zone: string,
    location: string,
    currentRunning: number,
    lastService: number,
    registeredDate: Date,
    user: User,
    measurement: string
  ) {
    try {
      const machine = await this.prisma.machine.findFirst({
        where: { id },
      });
      if (machine.machineNumber != machineNumber) {
        await this.createMachineHistoryInBackground({
          type: 'Machine Edit',
          description: `Machine number changed from ${machine.machineNumber} to ${machineNumber}.`,
          machineId: id,
          completedById: user.id,
        });
      }
      if (machine.model != model) {
        await this.createMachineHistoryInBackground({
          type: 'Machine Edit',
          description: `Model changed from ${machine.model} to ${model}.`,
          machineId: id,
          completedById: user.id,
        });
      }
      if (machine.type != type) {
        await this.createMachineHistoryInBackground({
          type: 'Machine Edit',
          description: `Type changed from ${machine.type} to ${type}.`,
          machineId: id,
          completedById: user.id,
        });
      }
      if (machine.zone != zone) {
        await this.createMachineHistoryInBackground({
          type: 'Machine Edit',
          description: `Zone changed from ${machine.zone} to ${zone}.`,
          machineId: id,
          completedById: user.id,
        });
      }
      if (machine.location != location) {
        await this.createMachineHistoryInBackground({
          type: 'Machine Edit',
          description: `Location changed from ${machine.location} to ${location}.`,
          machineId: id,
          completedById: user.id,
        });
      }
      if (machine.currentRunning != currentRunning) {
        await this.createMachineHistoryInBackground({
          type: 'Machine Edit',
          description: `Current Running changed from ${machine.currentRunning} to ${currentRunning}.`,
          machineId: id,
          completedById: user.id,
        });
      }
      if (machine.lastService != lastService) {
        await this.createMachineHistoryInBackground({
          type: 'Machine Edit',
          description: `Last Service changed from ${machine.lastService} to ${lastService}.`,
          machineId: id,
          completedById: user.id,
        });
      }
      if (machine.measurement != measurement) {
        await this.createMachineHistoryInBackground({
          type: 'Machine Edit',
          description: `Measurement changed from ${machine.measurement} to ${measurement}.`,
          machineId: id,
          completedById: user.id,
        });
      }
      if (
        moment(machine.registeredDate).format('DD MMMM YYYY HH:mm:ss') !=
        moment(registeredDate).format('DD MMMM YYYY HH:mm:ss')
      ) {
        await this.createMachineHistoryInBackground({
          type: 'Machine Edit',
          description: `Registered date changed from ${moment(
            machine.registeredDate
          ).format('DD MMMM YYYY')} to ${moment(registeredDate).format(
            'DD MMMM YYYY'
          )}.`,
          machineId: id,
          completedById: user.id,
        });
      }
      const machineUsers = await this.getMachineUserIds(id, user.id);
      for (let index = 0; index < machineUsers.length; index++) {
        await this.notificationService.createInBackground({
          userId: machineUsers[index],
          body: `${user.fullName} (${user.rcno}) edited machine (${id})}`,
          link: `/machine/${id}`,
        });
      }
      const interService = currentRunning - lastService;
      await this.prisma.machine.update({
        data: {
          machineNumber,
          model,
          type,
          zone,
          location,
          currentRunning,
          lastService,
          registeredDate,
          interService,
          measurement,
        },
        where: { id },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Set machine status. */
  async setMachineStatus(user: User, machineId: number, status: MachineStatus) {
    try {
      if (status === 'Working') {
        await this.prisma.machineBreakdown.updateMany({
          where: { machineId },
          data: { status: 'Done' },
        });
        await this.prisma.machineRepair.updateMany({
          where: { machineId },
          data: { status: 'Done' },
        });
      }

      await this.createMachineHistoryInBackground({
        type: 'Machine Status Change',
        description: `(${machineId}) Set status to ${status}`,
        machineId: machineId,
        completedById: user.id,
        machineStatus: status,
      });
      await this.prisma.machine.update({
        where: { id: machineId },
        data: { status, statusChangedAt: new Date() },
      });
      const machineUsers = await this.getMachineUserIds(machineId, user.id);
      for (let index = 0; index < machineUsers.length; index++) {
        await this.notificationService.createInBackground({
          userId: machineUsers[index],
          body: `${user.fullName} (${user.rcno}) set status to ${status} on machine ${machineId}`,
          link: `/machine/${machineId}`,
        });
      }
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  // Get machine details
  async getSingleMachine(user: User, machineId: number) {
    const machine = await this.prisma.machine.findFirst({
      where: { id: machineId },
      include: {
        createdBy: true,
        checklistItems: true,
        assignees: { include: { user: true } },
      },
    });
    if (!machine) throw new BadRequestException('Machine not found.');

    // Assigning data from db to the gql shape as it does not match 1:1
    const machineResp = new Machine();
    Object.assign(machineResp, machine);
    machineResp.assignees = machine.assignees.map((assign) => assign.user);
    return machineResp;
  }

  //** Get machine. Results are paginated. User cursor argument to go forward/backward. */
  async getMachineWithPagination(
    user: User,
    args: MachineConnectionArgs
  ): Promise<PaginatedMachine> {
    const { limit, offset } = getPagingParameters(args);
    const limitPlusOne = limit + 1;
    const { createdById, search, assignedToId, status } = args;

    // eslint-disable-next-line prefer-const
    let where: any = { AND: [] };
    if (createdById) {
      where.AND.push({ createdById });
    }

    if (assignedToId) {
      where.AND.push({
        assignees: { some: { userId: assignedToId } },
      });
    }

    if (status) {
      where.AND.push({ status });
    }
    //for now these only
    if (search) {
      const or: any = [
        { model: { contains: search, mode: 'insensitive' } },
        { machineNumber: { contains: search, mode: 'insensitive' } },
      ];
      // If search contains all numbers, search the machine ids as well
      if (/^(0|[1-9]\d*)$/.test(search)) {
        or.push({ id: parseInt(search) });
      }
      where.AND.push({
        OR: or,
      });
    }
    const machine = await this.prisma.machine.findMany({
      skip: offset,
      take: limitPlusOne,
      where,
      include: {
        createdBy: true,
        sparePRs: { orderBy: { id: 'desc' } },
        breakdowns: { orderBy: { id: 'desc' } },
      },
    });

    const count = await this.prisma.machine.count({ where });
    const { edges, pageInfo } = connectionFromArraySlice(
      machine.slice(0, limit),
      args,
      {
        arrayLength: count,
        sliceStart: offset,
      }
    );
    return {
      edges,
      pageInfo: {
        ...pageInfo,
        count,
        hasNextPage: offset + limit < count,
        hasPreviousPage: offset >= limit,
      },
    };
  }

  //** Create machine checklist item. */
  async createMachineChecklistItem(
    user: User,
    machineId: number,
    description: string,
    type: string
  ) {
    try {
      await this.prisma.machineChecklistItem.create({
        data: { machineId, description, type },
      });
      await this.createMachineHistoryInBackground({
        type: 'Add Checklist',
        description: `Added new checklist`,
        machineId: machineId,
        completedById: user.id,
      });
      const machineUsers = await this.getMachineUserIds(machineId, user.id);
      for (let index = 0; index < machineUsers.length; index++) {
        await this.notificationService.createInBackground({
          userId: machineUsers[index],
          body: `${user.fullName} (${user.rcno}) added new checklist on machine ${machineId}`,
          link: `/machine/${machineId}`,
        });
      }
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Edit machine checklist item. */
  //Not used
  async editMachineChecklistItem(
    user: User,
    id: number,
    description: string,
    type: string
  ) {
    try {
      const checklist = await this.prisma.machineChecklistItem.findFirst({
        where: { id },
      });
      if (checklist.description != description) {
        await this.createMachineHistoryInBackground({
          type: 'Checklist Edit',
          description: `Description changed from ${checklist.description} to ${description}.`,
          machineId: checklist.machineId,
          completedById: user.id,
        });
      }
      if (checklist.type != type) {
        await this.createMachineHistoryInBackground({
          type: 'Checklist Edit',
          description: `Type changed from ${checklist.type} to ${type}.`,
          machineId: checklist.machineId,
          completedById: user.id,
        });
      }
      await this.prisma.machineChecklistItem.update({
        where: { id },
        data: { description, type },
      });
      const machineUsers = await this.getMachineUserIds(
        checklist.machineId,
        user.id
      );
      for (let index = 0; index < machineUsers.length; index++) {
        await this.notificationService.createInBackground({
          userId: machineUsers[index],
          body: `${user.fullName} (${user.rcno}) edited checklist (${checklist.id}) on machine ${checklist.machineId}`,
          link: `/machine/${checklist.machineId}`,
        });
      }
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Delete machine checklist item. */
  async deleteMachineChecklistItem(user: User, id: number) {
    try {
      const checklist = await this.prisma.machineChecklistItem.findFirst({
        where: { id },
        select: {
          id: true,
          machineId: true,
          description: true,
        },
      });
      await this.createMachineHistoryInBackground({
        type: 'Checklist Delete',
        description: `Checklist (${checklist.description}) deleted.`,
        machineId: checklist.machineId,
        completedById: user.id,
      });
      const machineUsers = await this.getMachineUserIds(
        checklist.machineId,
        user.id
      );
      for (let index = 0; index < machineUsers.length; index++) {
        await this.notificationService.createInBackground({
          userId: machineUsers[index],
          body: `${user.fullName} (${user.rcno}) deleted checklist (${checklist.id}) on machine ${checklist.machineId}`,
          link: `/machine/${checklist.machineId}`,
        });
      }
      await this.prisma.machineChecklistItem.delete({
        where: { id },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Set checklist item as complete or incomplete. */
  async toggleMachineChecklistItem(
    user: User,
    id: number[],
    currentMeterReading: number,
    workingHour: number,
    uncheckId: number[]
  ) {
    try {
      //const uniqueIDs = [...new Set(id)];
      let machineID;
      for (let index = 0; index < id.length; index++) {
        const checklist = await this.prisma.machineChecklistItem.findFirst({
          where: { id: id[index] },
          select: {
            id: true,
            machineId: true,
            description: true,
            completedById: true,
          },
        });
        machineID = checklist.machineId;
        await this.createMachineHistoryInBackground({
          type: 'Toggled',
          description: `Checklist (${checklist.description}) completed.`,
          machineId: checklist.machineId,
          completedById: user.id,
        });

        const machineUsers = await this.getMachineUserIds(
          checklist.machineId,
          user.id
        );
        for (let index = 0; index < machineUsers.length; index++) {
          await this.notificationService.createInBackground({
            userId: machineUsers[index],
            body: `${user.fullName} (${user.rcno}) set checklist (${checklist.id}) on machine ${checklist.machineId} to completed`,
            link: `/machine/${checklist.machineId}`,
          });
        }
        await this.prisma.machineChecklistItem.update({
          where: { id: id[index] },
          data: {
            completedById: user.id,
            completedAt: new Date(),
            currentMeterReading,
            workingHour,
          },
        });
      }

      for (let index = 0; index < uncheckId.length; index++) {
        const checklist = await this.prisma.machineChecklistItem.findFirst({
          where: { id: uncheckId[index] },
          select: {
            id: true,
            machineId: true,
            description: true,
            completedById: true,
          },
        });

        await this.createMachineHistoryInBackground({
          type: 'Toggled',
          description: `Checklist (${checklist.description}) unchecked.`,
          machineId: checklist.machineId,
          completedById: user.id,
        });

        const machineUsers = await this.getMachineUserIds(
          checklist.machineId,
          user.id
        );
        for (let index = 0; index < machineUsers.length; index++) {
          await this.notificationService.createInBackground({
            userId: machineUsers[index],
            body: `${user.fullName} (${user.rcno}) set checklist (${checklist.id}) on machine ${checklist.machineId} to unchecked`,
            link: `/machine/${checklist.machineId}`,
          });
        }
        await this.prisma.machineChecklistItem.update({
          where: { id: uncheckId[index] },
          data: {
            completedById: null,
            completedAt: null,
            currentMeterReading,
            workingHour,
          },
        });
      }

      await this.prisma.machine.update({
        where: { id: machineID },
        data: {
          currentRunning: currentMeterReading,
        },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Create machine periodic maintenance. */
  async createMachinePeriodicMaintenance(
    user: User,
    machineId: number,
    title: string,
    description: string,
    measurement: string,
    value: number,
    startDate: Date,
    tasks: string[]
  ) {
    try {
      const periodicMaintenance =
        await this.prisma.machinePeriodicMaintenance.create({
          data: {
            machineId,
            title,
            description,
            measurement,
            value,
            startDate,
          },
        });

      await this.prisma.machinePeriodicMaintenanceTask.createMany({
        data: tasks.map((task) => ({
          periodicMaintenanceId: periodicMaintenance.id,
          name: task,
        })),
      });
      await this.createMachineHistoryInBackground({
        type: 'Add Periodic Maintenance',
        description: `Added periodic maintenance (${periodicMaintenance.id})`,
        machineId: machineId,
        completedById: user.id,
      });
      const machineUsers = await this.getMachineUserIds(
        periodicMaintenance.machineId,
        user.id
      );
      for (let index = 0; index < machineUsers.length; index++) {
        await this.notificationService.createInBackground({
          userId: machineUsers[index],
          body: `${user.fullName} (${user.rcno}) added new periodic maintenance on machine ${machineId}`,
          link: `/machine/${machineId}`,
        });
      }
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Edit machine periodic maintenance. */
  async editMachinePeriodicMaintenance(
    user: User,
    id: number,
    title: string,
    description: string,
    measurement: string,
    value: number,
    startDate: Date,
    tasks: string[]
  ) {
    try {
      const periodicMaintenance =
        await this.prisma.machinePeriodicMaintenance.findFirst({
          where: { id },
          select: {
            id: true,
            machineId: true,
            title: true,
            description: true,
            measurement: true,
            startDate: true,
            value: true,
          },
        });
      if (periodicMaintenance.title != title) {
        await this.createMachineHistoryInBackground({
          type: 'Periodic Maintenance Edit',
          description: `(${id}) Title changed from ${periodicMaintenance.title} to ${title}.`,
          machineId: periodicMaintenance.machineId,
          completedById: user.id,
        });
      }
      if (periodicMaintenance.description != description) {
        await this.createMachineHistoryInBackground({
          type: 'Periodic Maintenance Edit',
          description: `(${id}) Description changed from ${periodicMaintenance.description} to ${description}.`,
          machineId: periodicMaintenance.machineId,
          completedById: user.id,
        });
      }
      if (periodicMaintenance.measurement != measurement) {
        await this.createMachineHistoryInBackground({
          type: 'Periodic Maintenance Edit',
          description: `(${id}) Measurement changed from ${periodicMaintenance.measurement} to ${measurement}.`,
          machineId: periodicMaintenance.machineId,
          completedById: user.id,
        });
      }
      if (periodicMaintenance.value != value) {
        await this.createMachineHistoryInBackground({
          type: 'Periodic Maintenance Edit',
          description: `(${id}) Value changed from ${periodicMaintenance.value} to ${value}.`,
          machineId: periodicMaintenance.machineId,
          completedById: user.id,
        });
      }
      if (
        moment(periodicMaintenance.startDate).format('DD MMMM YYYY HH:mm:ss') !=
        moment(startDate).format('DD MMMM YYYY HH:mm:ss')
      ) {
        await this.createMachineHistoryInBackground({
          type: 'Periodic Maintenance Edit',
          description: `(${id}) Start date changed from ${periodicMaintenance.startDate} to ${startDate}.`,
          machineId: periodicMaintenance.machineId,
          completedById: user.id,
        });
      }
      const machineUsers = await this.getMachineUserIds(
        periodicMaintenance.machineId,
        user.id
      );
      for (let index = 0; index < machineUsers.length; index++) {
        await this.notificationService.createInBackground({
          userId: machineUsers[index],
          body: `${user.fullName} (${user.rcno}) edited periodic maintenance (${periodicMaintenance.id}) on machine ${periodicMaintenance.machineId}`,
          link: `/machine/${periodicMaintenance.machineId}`,
        });
      }
      await this.prisma.machinePeriodicMaintenance.update({
        where: { id },
        data: {
          title,
          description,
          measurement,
          value,
          startDate,
        },
      });
      await this.prisma.machinePeriodicMaintenanceTask.createMany({
        data: tasks.map((task) => ({
          periodicMaintenanceId: periodicMaintenance.id,
          name: task,
        })),
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Delete machine periodic maintenance. */
  async deleteMachinePeriodicMaintenance(user: User, id: number) {
    try {
      const periodicMaintenance =
        await this.prisma.machinePeriodicMaintenance.findFirst({
          where: { id },
          select: {
            id: true,
            machineId: true,
            title: true,
          },
        });
      const machineUsers = await this.getMachineUserIds(
        periodicMaintenance.machineId,
        user.id
      );
      for (let index = 0; index < machineUsers.length; index++) {
        await this.notificationService.createInBackground({
          userId: machineUsers[index],
          body: `${user.fullName} (${user.rcno}) deleted periodic maintenance (${periodicMaintenance.id}) on machine ${periodicMaintenance.machineId}`,
          link: `/machine/${periodicMaintenance.machineId}`,
        });
      }

      await this.createMachineHistoryInBackground({
        type: 'Periodic Maintenance Delete',
        description: `(${id}) Periodic Maintenance (${periodicMaintenance.title}) deleted.`,
        machineId: periodicMaintenance.machineId,
        completedById: user.id,
      });
      await this.prisma.machinePeriodicMaintenance.delete({
        where: { id },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Set machine periodic maintenance status. */
  async setMachinePeriodicMaintenanceStatus(
    user: User,
    id: number,
    status: PeriodicMaintenanceStatus
  ) {
    try {
      let completedFlag = false;
      const periodicMaintenance =
        await this.prisma.machinePeriodicMaintenance.findFirst({
          where: { id },
          select: {
            machineId: true,
          },
        });
      if (status == 'Done') {
        completedFlag = true;
        await this.createMachineHistoryInBackground({
          type: 'Periodic Maintenance Status',
          description: `(${id}) Set status to ${status}.`,
          machineId: periodicMaintenance.machineId,
          completedById: user.id,
        });
      }
      if (status == 'Pending') {
        await this.createMachineHistoryInBackground({
          type: 'Periodic Maintenance Status',
          description: `(${id}) Set status to ${status}.`,
          machineId: periodicMaintenance.machineId,
          completedById: user.id,
        });
      }
      if (status == 'Missed') {
        await this.createMachineHistoryInBackground({
          type: 'Periodic Maintenance Status',
          description: `(${id}) Set status to ${status}.`,
          machineId: periodicMaintenance.machineId,
          completedById: user.id,
        });
      }
      const machineUsers = await this.getMachineUserIds(
        periodicMaintenance.machineId,
        user.id
      );
      for (let index = 0; index < machineUsers.length; index++) {
        await this.notificationService.createInBackground({
          userId: machineUsers[index],
          body: `${user.fullName} (${user.rcno}) set periodic maintenance status to (${status}) on machine ${periodicMaintenance.machineId}`,
          link: `/machine/${periodicMaintenance.machineId}`,
        });
      }
      await this.prisma.machinePeriodicMaintenance.update({
        where: { id },
        data: completedFlag
          ? { completedById: user.id, completedAt: new Date(), status }
          : { completedById: null, completedAt: null, status },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }
  //** Create machine repair. */
  async createMachineRepair(
    user: User,
    machineId: number,
    title: string,
    description: string
  ) {
    try {
      const repair = await this.prisma.machineRepair.create({
        data: {
          machineId,
          title,
          description,
        },
      });
      await this.createMachineHistoryInBackground({
        type: 'Add Repair',
        description: `Added repair (${repair.id})`,
        machineId: machineId,
        completedById: user.id,
      });
      const machineUsers = await this.getMachineUserIds(machineId, user.id);
      for (let index = 0; index < machineUsers.length; index++) {
        await this.notificationService.createInBackground({
          userId: machineUsers[index],
          body: `${user.fullName} (${user.rcno}) added new repair on machine ${machineId}`,
          link: `/machine/${machineId}`,
        });
      }
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Edit machine repair. */
  async editMachineRepair(
    user: User,
    id: number,
    title: string,
    description: string
  ) {
    try {
      const repair = await this.prisma.machineRepair.findFirst({
        where: { id },
        select: {
          id: true,
          machineId: true,
          title: true,
          description: true,
        },
      });
      if (repair.title != title) {
        await this.createMachineHistoryInBackground({
          type: 'Repair Edit',
          description: `(${id}) Title changed from ${repair.title} to ${title}.`,
          machineId: repair.machineId,
          completedById: user.id,
        });
      }
      if (repair.description != description) {
        await this.createMachineHistoryInBackground({
          type: 'Repair Edit',
          description: `(${id}) Description changed from ${repair.description} to ${description}.`,
          machineId: repair.machineId,
          completedById: user.id,
        });
      }

      const machineUsers = await this.getMachineUserIds(
        repair.machineId,
        user.id
      );
      for (let index = 0; index < machineUsers.length; index++) {
        await this.notificationService.createInBackground({
          userId: machineUsers[index],
          body: `${user.fullName} (${user.rcno}) edited repair (${repair.id}) on machine ${repair.machineId}`,
          link: `/machine/${repair.machineId}`,
        });
      }
      await this.prisma.machineRepair.update({
        where: { id },
        data: { title, description },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Delete machine repair. */
  async deleteMachineRepair(user: User, id: number) {
    try {
      const repair = await this.prisma.machineRepair.findFirst({
        where: { id },
        select: {
          id: true,
          machineId: true,
          title: true,
        },
      });
      await this.createMachineHistoryInBackground({
        type: 'Repair Delete',
        description: `(${id}) Repair (${repair.title}) deleted.`,
        machineId: repair.machineId,
        completedById: user.id,
      });
      const machineUsers = await this.getMachineUserIds(
        repair.machineId,
        user.id
      );
      for (let index = 0; index < machineUsers.length; index++) {
        await this.notificationService.createInBackground({
          userId: machineUsers[index],
          body: `${user.fullName} (${user.rcno}) deleted repair (${repair.id}) on machine ${repair.machineId}`,
          link: `/machine/${repair.machineId}`,
        });
      }
      await this.prisma.machineRepair.delete({
        where: { id },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Set machine repair status. */
  async setMachineRepairStatus(user: User, id: number, status: RepairStatus) {
    try {
      let completedFlag = false;
      const repair = await this.prisma.machineRepair.findFirst({
        where: { id },
        select: {
          machineId: true,
        },
      });
      if (status == 'Done') {
        completedFlag = true;
        await this.createMachineHistoryInBackground({
          type: 'Repair Status',
          description: `(${id}) Set status to ${status}.`,
          machineId: repair.machineId,
          completedById: user.id,
        });
      }
      if (status == 'Pending') {
        await this.createMachineHistoryInBackground({
          type: 'Repair Status',
          description: `(${id}) Set status to ${status}.`,
          machineId: repair.machineId,
          completedById: user.id,
        });
      }
      const machineUsers = await this.getMachineUserIds(
        repair.machineId,
        user.id
      );
      for (let index = 0; index < machineUsers.length; index++) {
        await this.notificationService.createInBackground({
          userId: machineUsers[index],
          body: `${user.fullName} (${user.rcno}) set repair status to (${status}) on machine ${repair.machineId}`,
          link: `/machine/${repair.machineId}`,
        });
      }
      await this.prisma.machineRepair.update({
        where: { id },
        data: completedFlag
          ? { completedById: user.id, completedAt: new Date(), status }
          : { completedById: null, completedAt: null, status },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Create machine spare pr. */
  async createMachineSparePR(
    user: User,
    machineId: number,
    requestedDate: Date,
    title: string,
    description: string
  ) {
    try {
      const sparePR = await this.prisma.machineSparePR.create({
        data: {
          machineId,
          requestedDate,
          title,
          description,
        },
      });
      await this.createMachineHistoryInBackground({
        type: 'Add Spare PR',
        description: `Added spare PR (${sparePR.id})`,
        machineId: machineId,
        completedById: user.id,
      });
      const machineUsers = await this.getMachineUserIds(machineId, user.id);
      for (let index = 0; index < machineUsers.length; index++) {
        await this.notificationService.createInBackground({
          userId: machineUsers[index],
          body: `${user.fullName} (${user.rcno}) added new spare PR on machine ${machineId}`,
          link: `/machine/${sparePR.machineId}`,
        });
      }
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Edit machine spare pr. */
  async editMachineSparePR(
    user: User,
    id: number,
    requestedDate: Date,
    title: string,
    description: string
  ) {
    try {
      const sparePR = await this.prisma.machineSparePR.findFirst({
        where: { id },
        select: {
          id: true,
          machineId: true,
          title: true,
          description: true,
          requestedDate: true,
        },
      });
      if (sparePR.title != title) {
        await this.createMachineHistoryInBackground({
          type: 'Spare PR Edit',
          description: `(${id}) Title changed from ${sparePR.title} to ${title}.`,
          machineId: sparePR.machineId,
          completedById: user.id,
        });
      }
      if (sparePR.description != description) {
        await this.createMachineHistoryInBackground({
          type: 'Spare PR Edit',
          description: `(${id}) Description changed from ${sparePR.description} to ${description}.`,
          machineId: sparePR.machineId,
          completedById: user.id,
        });
      }
      if (
        moment(sparePR.requestedDate).format('DD MMMM YYYY HH:mm:ss') !=
        moment(requestedDate).format('DD MMMM YYYY HH:mm:ss')
      ) {
        await this.createMachineHistoryInBackground({
          type: 'Spare PR Edit',
          description: `Requested date changed from ${moment(
            sparePR.requestedDate
          ).format('DD MMMM YYYY')} to ${moment(requestedDate).format(
            'DD MMMM YYYY'
          )}.`,
          machineId: sparePR.machineId,
          completedById: user.id,
        });
      }
      const machineUsers = await this.getMachineUserIds(
        sparePR.machineId,
        user.id
      );
      for (let index = 0; index < machineUsers.length; index++) {
        await this.notificationService.createInBackground({
          userId: machineUsers[index],
          body: `${user.fullName} (${user.rcno}) edited spare PR (${sparePR.id}) on machine ${sparePR.machineId}`,
          link: `/machine/${sparePR.machineId}`,
        });
      }
      await this.prisma.machineSparePR.update({
        where: { id },
        data: { requestedDate, title, description },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Delete machine spare pr. */
  async deleteMachineSparePR(user: User, id: number) {
    try {
      const sparePR = await this.prisma.machineSparePR.findFirst({
        where: { id },
        select: {
          id: true,
          machineId: true,
          title: true,
        },
      });
      await this.createMachineHistoryInBackground({
        type: 'Spare PR Delete',
        description: `(${id}) Spare PR (${sparePR.title}) deleted.`,
        machineId: sparePR.machineId,
        completedById: user.id,
      });
      const machineUsers = await this.getMachineUserIds(
        sparePR.machineId,
        user.id
      );
      for (let index = 0; index < machineUsers.length; index++) {
        await this.notificationService.createInBackground({
          userId: machineUsers[index],
          body: `${user.fullName} (${user.rcno}) deleted spare PR (${sparePR.id}) on machine ${sparePR.machineId}`,
          link: `/machine/${sparePR.machineId}`,
        });
      }
      await this.prisma.machineSparePR.delete({
        where: { id },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Set machine spare pr status. */
  async setMachineSparePRStatus(user: User, id: number, status: SparePRStatus) {
    try {
      let completedFlag = false;
      const sparePR = await this.prisma.machineSparePR.findFirst({
        where: { id },
        select: {
          machineId: true,
        },
      });
      if (status == 'Done') {
        completedFlag = true;
        await this.createMachineHistoryInBackground({
          type: 'Spare PR Status',
          description: `(${id}) Set status to ${status}.`,
          machineId: sparePR.machineId,
          completedById: user.id,
        });
      }
      if (status == 'Pending') {
        await this.createMachineHistoryInBackground({
          type: 'Spare PR Status',
          description: `(${id}) Set status to ${status}.`,
          machineId: sparePR.machineId,
          completedById: user.id,
        });
      }
      const machineUsers = await this.getMachineUserIds(
        sparePR.machineId,
        user.id
      );
      for (let index = 0; index < machineUsers.length; index++) {
        await this.notificationService.createInBackground({
          userId: machineUsers[index],
          body: `${user.fullName} (${user.rcno}) set spare PR status to (${status}) on machine ${sparePR.machineId}`,
          link: `/machine/${sparePR.machineId}`,
        });
      }
      await this.prisma.machineSparePR.update({
        where: { id },
        data: completedFlag
          ? { completedById: user.id, completedAt: new Date(), status }
          : { completedById: null, completedAt: null, status },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Create machine breakdown. */
  async createMachineBreakdown(
    user: User,
    machineId: number,
    title: string,
    description: string
  ) {
    try {
      const breakdown = await this.prisma.machineBreakdown.create({
        data: {
          machineId,
          title,
          description,
        },
      });

      await this.prisma.machine.update({
        where: { id: machineId },
        data: { status: 'Breakdown' },
      });
      await this.createMachineHistoryInBackground({
        type: 'Add Breakdown',
        description: `Added breakdown (${breakdown.id})`,
        machineId: machineId,
        completedById: user.id,
      });
      const machineUsers = await this.getMachineUserIds(machineId, user.id);
      for (let index = 0; index < machineUsers.length; index++) {
        await this.notificationService.createInBackground({
          userId: machineUsers[index],
          body: `${user.fullName} (${user.rcno}) added new breakdown on machine ${machineId}`,
          link: `/machine/${machineId}`,
        });
      }
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Edit machine breakdown */
  async editMachineBreakdown(
    user: User,
    id: number,
    title: string,
    description: string,
    estimatedDateOfRepair: Date
  ) {
    try {
      const breakdown = await this.prisma.machineBreakdown.findFirst({
        where: { id },
        select: {
          id: true,
          machineId: true,
          title: true,
          description: true,
          estimatedDateOfRepair: true,
        },
      });
      if (breakdown.title != title) {
        await this.createMachineHistoryInBackground({
          type: 'Breakdown Edit',
          description: `(${id}) Title changed from ${breakdown.title} to ${title}.`,
          machineId: breakdown.machineId,
          completedById: user.id,
        });
      }
      if (breakdown.description != description) {
        await this.createMachineHistoryInBackground({
          type: 'Breakdown Edit',
          description: `(${id}) Description changed from ${breakdown.description} to ${description}.`,
          machineId: breakdown.machineId,
          completedById: user.id,
        });
      }
      if (
        moment(breakdown.estimatedDateOfRepair).format(
          'DD MMMM YYYY HH:mm:ss'
        ) != moment(estimatedDateOfRepair).format('DD MMMM YYYY HH:mm:ss')
      ) {
        await this.createMachineHistoryInBackground({
          type: 'Breakdown Edit',
          description: `Estimated date of repair changed from ${moment(
            breakdown.estimatedDateOfRepair
          ).format('DD MMMM YYYY')} to ${moment(estimatedDateOfRepair).format(
            'DD MMMM YYYY'
          )}.`,
          machineId: id,
          completedById: user.id,
        });
      }
      const machineUsers = await this.getMachineUserIds(
        breakdown.machineId,
        user.id
      );
      for (let index = 0; index < machineUsers.length; index++) {
        await this.notificationService.createInBackground({
          userId: machineUsers[index],
          body: `${user.fullName} (${user.rcno}) edited breakdown (${breakdown.id}) on machine ${breakdown.machineId}`,
          link: `/machine/${breakdown.machineId}`,
        });
      }
      await this.prisma.machineBreakdown.update({
        where: { id },
        data: { title, description, estimatedDateOfRepair },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Delete machine breakdown */
  async deleteMachineBreakdown(user: User, id: number) {
    try {
      const breakdown = await this.prisma.machineBreakdown.findFirst({
        where: { id },
        select: {
          id: true,
          machineId: true,
          title: true,
        },
      });
      await this.createMachineHistoryInBackground({
        type: 'Breakdown Delete',
        description: `(${id}) Breakdown (${breakdown.title}) deleted.`,
        machineId: breakdown.machineId,
        completedById: user.id,
      });
      const machineUsers = await this.getMachineUserIds(
        breakdown.machineId,
        user.id
      );
      for (let index = 0; index < machineUsers.length; index++) {
        await this.notificationService.createInBackground({
          userId: machineUsers[index],
          body: `${user.fullName} (${user.rcno}) deleted breakdown (${breakdown.id}) on machine ${breakdown.machineId}`,
          link: `/machine/${breakdown.machineId}`,
        });
      }
      await this.prisma.machineBreakdown.delete({
        where: { id },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Set machine breakdown status. */
  async setMachineBreakdownStatus(
    user: User,
    id: number,
    status: BreakdownStatus
  ) {
    try {
      let completedFlag = false;
      let machineStatus;
      const breakdown = await this.prisma.machineBreakdown.findFirst({
        where: { id },
        select: {
          machineId: true,
        },
      });
      if (status == 'Done') {
        completedFlag = true;
        machineStatus = 'Working';
        await this.createMachineHistoryInBackground({
          type: 'Repair Status',
          description: `(${id}) Set status to ${status}.`,
          machineId: breakdown.machineId,
          completedById: user.id,
        });
      }
      if (status == 'Pending') {
        machineStatus = 'Pending';
        await this.createMachineHistoryInBackground({
          type: 'Repair Status',
          description: `(${id}) Set status to ${status}.`,
          machineId: breakdown.machineId,
          completedById: user.id,
        });
      }
      if (status == 'Breakdown') {
        machineStatus = 'Breakdown';
        await this.createMachineHistoryInBackground({
          type: 'Repair Status',
          description: `(${id}) Set status to ${status}.`,
          machineId: breakdown.machineId,
          completedById: user.id,
        });

        const machineUsers = await this.getMachineUserIds(
          breakdown.machineId,
          user.id
        );
        for (let index = 0; index < machineUsers.length; index++) {
          await this.notificationService.createInBackground({
            userId: machineUsers[index],
            body: `${user.fullName} (${user.rcno}) set breakdown status to (${status}) on machine ${breakdown.machineId}`,
            link: `/machine/${breakdown.machineId}`,
          });
        }
        //set machine status
        await this.prisma.machine.update({
          where: { id: breakdown.machineId },
          data: { status: machineStatus },
        });
      }

      await this.prisma.machineBreakdown.update({
        where: { id },
        data: completedFlag
          ? { completedById: user.id, completedAt: new Date(), status }
          : { completedById: null, completedAt: null, status },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Get machine repair. Results are paginated. User cursor argument to go forward/backward. */
  async getMachineRepairWithPagination(
    user: User,
    args: MachineRepairConnectionArgs
  ): Promise<PaginatedMachineRepair> {
    const { limit, offset } = getPagingParameters(args);
    const limitPlusOne = limit + 1;
    const { search, machineId } = args;

    // eslint-disable-next-line prefer-const
    let where: any = { AND: [] };

    if (machineId) {
      where.AND.push({ machineId });
    }
    //for now these only
    if (search) {
      const or: any = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
      // If search contains all numbers, search the machine ids as well
      if (/^(0|[1-9]\d*)$/.test(search)) {
        or.push({ id: parseInt(search) });
      }
      where.AND.push({
        OR: or,
      });
    }
    const machineRepair = await this.prisma.machineRepair.findMany({
      skip: offset,
      take: limitPlusOne,
      where,
      orderBy: { id: 'desc' },
    });

    const count = await this.prisma.machineRepair.count({ where });
    const { edges, pageInfo } = connectionFromArraySlice(
      machineRepair.slice(0, limit),
      args,
      {
        arrayLength: count,
        sliceStart: offset,
      }
    );
    return {
      edges,
      pageInfo: {
        ...pageInfo,
        count,
        hasNextPage: offset + limit < count,
        hasPreviousPage: offset >= limit,
      },
    };
  }

  //** Get machine breakdown. Results are paginated. User cursor argument to go forward/backward. */
  async getMachineBreakdownWithPagination(
    user: User,
    args: MachineBreakdownConnectionArgs
  ): Promise<PaginatedMachineBreakdown> {
    const { limit, offset } = getPagingParameters(args);
    const limitPlusOne = limit + 1;
    const { search, machineId } = args;

    // eslint-disable-next-line prefer-const
    let where: any = { AND: [] };

    if (machineId) {
      where.AND.push({ machineId });
    }
    //for now these only
    if (search) {
      const or: any = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
      // If search contains all numbers, search the machine ids as well
      if (/^(0|[1-9]\d*)$/.test(search)) {
        or.push({ id: parseInt(search) });
      }
      where.AND.push({
        OR: or,
      });
    }
    const machineBreakdown = await this.prisma.machineBreakdown.findMany({
      skip: offset,
      take: limitPlusOne,
      where,
      include: {
        completedBy: true,
      },
      orderBy: { id: 'desc' },
    });

    const count = await this.prisma.machineBreakdown.count({ where });
    const { edges, pageInfo } = connectionFromArraySlice(
      machineBreakdown.slice(0, limit),
      args,
      {
        arrayLength: count,
        sliceStart: offset,
      }
    );
    return {
      edges,
      pageInfo: {
        ...pageInfo,
        count,
        hasNextPage: offset + limit < count,
        hasPreviousPage: offset >= limit,
      },
    };
  }

  //** Get machine spare PR. Results are paginated. User cursor argument to go forward/backward. */
  async getMachineSparePRWithPagination(
    user: User,
    args: MachineSparePRConnectionArgs
  ): Promise<PaginatedMachineSparePR> {
    const { limit, offset } = getPagingParameters(args);
    const limitPlusOne = limit + 1;
    const { search, machineId } = args;

    // eslint-disable-next-line prefer-const
    let where: any = { AND: [] };

    if (machineId) {
      where.AND.push({ machineId });
    }
    //for now these only
    if (search) {
      const or: any = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
      // If search contains all numbers, search the machine ids as well
      if (/^(0|[1-9]\d*)$/.test(search)) {
        or.push({ id: parseInt(search) });
      }
      where.AND.push({
        OR: or,
      });
    }
    const machineSparePR = await this.prisma.machineSparePR.findMany({
      skip: offset,
      take: limitPlusOne,
      where,
      include: {
        completedBy: true,
      },
      orderBy: { id: 'desc' },
    });

    const count = await this.prisma.machineSparePR.count({ where });
    const { edges, pageInfo } = connectionFromArraySlice(
      machineSparePR.slice(0, limit),
      args,
      {
        arrayLength: count,
        sliceStart: offset,
      }
    );
    return {
      edges,
      pageInfo: {
        ...pageInfo,
        count,
        hasNextPage: offset + limit < count,
        hasPreviousPage: offset >= limit,
      },
    };
  }

  //** Assign 'user' to machine. */
  async assignUserToMachine(user: User, machineId: number, userIds: number[]) {
    try {
      const machineUserIds = await this.getMachineUserIds(machineId, user.id);
      const machineUsersExceptNewAssignments = machineUserIds.filter(
        (id) => !userIds.includes(id)
      );
      const newAssignments = await this.prisma.user.findMany({
        where: {
          id: { in: userIds },
        },
        select: {
          id: true,
          fullName: true,
          rcno: true,
          email: true,
        },
      });

      // Text format new assignments into a readable list with commas and 'and'
      // at the end.
      const newAssignmentsFormatted = newAssignments
        .map((a) => `${a.fullName} (${a.rcno})`)
        .join(', ')
        .replace(/, ([^,]*)$/, ' and $1');
      // Notification to machine assigned users except new assignments
      for (const id of machineUsersExceptNewAssignments) {
        await this.notificationService.createInBackground({
          userId: id,
          body: `${user.fullName} (${user.rcno}) assigned ${newAssignmentsFormatted} to machine ${machineId}`,
          link: `/machine/${machineId}`,
        });
        await this.createMachineHistoryInBackground({
          type: 'User Assign',
          description: `${user.fullName} (${user.rcno}) assigned ${newAssignmentsFormatted} to machine ${machineId}`,
          machineId: machineId,
          completedById: user.id,
        });
      }

      // Notification to new assignments
      const newAssignmentsWithoutCurrentUser = newAssignments.filter(
        (na) => na.id !== user.id
      );
      const emailBody = `You have been assigned to machine ${machineId}`;
      for (const newAssignment of newAssignmentsWithoutCurrentUser) {
        await this.notificationService.createInBackground({
          userId: newAssignment.id,
          body: emailBody,
          link: `/machine/${machineId}`,
        });
        await this.createMachineHistoryInBackground({
          type: 'User Assign',
          description: `${newAssignment.fullName} (${newAssignment.rcno}) assigned to machine.`,
          machineId: machineId,
          completedById: user.id,
        });
      }
      await this.prisma.machineAssignment.createMany({
        data: userIds.map((userId) => ({
          machineId,
          userId,
        })),
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new BadRequestException(
          `User is already assigned to this machine.`
        );
      } else {
        console.log(e);
        throw new InternalServerErrorException('Unexpected error occured.');
      }
    }
  }

  //** unassign user from machine. */
  async unassignUserFromMachine(user: User, machineId: number, userId: number) {
    try {
      const unassign = await this.prisma.user.findFirst({
        where: {
          id: userId,
        },
        select: {
          fullName: true,
          rcno: true,
        },
      });
      await this.createMachineHistoryInBackground({
        type: 'User Unassigned',
        description: `${unassign.fullName} (${unassign.rcno}) unassigned from machine.`,
        machineId: machineId,
        completedById: user.id,
      });
      await this.prisma.machineAssignment.deleteMany({
        where: { machineId, userId },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Get machine periodic maintenance. Results are paginated. User cursor argument to go forward/backward. */
  async getMachinePeriodicMaintenanceWithPagination(
    user: User,
    args: MachinePeriodicMaintenanceConnectionArgs
  ): Promise<PaginatedMachinePeriodicMaintenance> {
    const { limit, offset } = getPagingParameters(args);
    const limitPlusOne = limit + 1;
    const { machineId, search } = args;

    // eslint-disable-next-line prefer-const
    let where: any = { AND: [] };
    if (machineId) {
      where.AND.push({ machineId });
    }

    //for now these only
    if (search) {
      const or: any = [
        { model: { contains: search, mode: 'insensitive' } },
        { machineNumber: { contains: search, mode: 'insensitive' } },
      ];
      // If search contains all numbers, search the machine ids as well
      if (/^(0|[1-9]\d*)$/.test(search)) {
        or.push({ id: parseInt(search) });
      }
      where.AND.push({
        OR: or,
      });
    }
    const machinePeriodicMaintenance =
      await this.prisma.machinePeriodicMaintenance.findMany({
        skip: offset,
        take: limitPlusOne,
        where,
        include: {
          completedBy: true,
          MachinePeriodicMaintenanceTask: {
            where: { parentTaskId: null },
            include: {
              subTasks: {
                include: {
                  subTasks: { include: { completedBy: true } },
                  completedBy: true,
                },
                orderBy: { id: 'asc' },
              },
              completedBy: true,
            },
            orderBy: { id: 'asc' },
          },
        },
        orderBy: { id: 'desc' },
      });

    const count = await this.prisma.machinePeriodicMaintenance.count({ where });
    const { edges, pageInfo } = connectionFromArraySlice(
      machinePeriodicMaintenance.slice(0, limit),
      args,
      {
        arrayLength: count,
        sliceStart: offset,
      }
    );
    return {
      edges,
      pageInfo: {
        ...pageInfo,
        count,
        hasNextPage: offset + limit < count,
        hasPreviousPage: offset >= limit,
      },
    };
  }

  //** Get machine history. Results are paginated. User cursor argument to go forward/backward. */
  async getMachineHistoryWithPagination(
    user: User,
    args: MachineHistoryConnectionArgs
  ): Promise<PaginatedMachineHistory> {
    const { limit, offset } = getPagingParameters(args);
    const limitPlusOne = limit + 1;
    const { search, machineId, location, from, to } = args;
    const fromDate = moment(from).startOf('day');
    const toDate = moment(to).endOf('day');

    // eslint-disable-next-line prefer-const
    let where: any = { AND: [] };

    if (machineId) {
      where.AND.push({ machineId });
    }

    if (location) {
      where.AND.push({ location });
    }

    if (from && to) {
      where.AND.push({
        createdAt: { gte: fromDate.toDate(), lte: toDate.toDate() },
      });
    }

    //for now these only
    if (search) {
      const or: any = [
        { type: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
      // If search contains all numbers, search the machine ids as well
      if (/^(0|[1-9]\d*)$/.test(search)) {
        or.push({ id: parseInt(search) });
      }
      where.AND.push({
        OR: or,
      });
    }
    const machineHistory = await this.prisma.machineHistory.findMany({
      skip: offset,
      take: limitPlusOne,
      where,
      include: {
        completedBy: true,
      },
      orderBy: { id: 'desc' },
    });

    const count = await this.prisma.machineHistory.count({ where });
    const { edges, pageInfo } = connectionFromArraySlice(
      machineHistory.slice(0, limit),
      args,
      {
        arrayLength: count,
        sliceStart: offset,
      }
    );
    return {
      edges,
      pageInfo: {
        ...pageInfo,
        count,
        hasNextPage: offset + limit < count,
        hasPreviousPage: offset >= limit,
      },
    };
  }

  //** Create machine history */
  async createMachineHistory(machineHistory: MachineHistoryInterface) {
    const machine = await this.prisma.machine.findFirst({
      where: { id: machineHistory.machineId },
      select: {
        status: true,
        type: true,
        location: true,
        id: true,
      },
    });
    const machineChecklistItem =
      await this.prisma.machineChecklistItem.findFirst({
        where: {
          machineId: machineHistory.machineId,
          NOT: [{ workingHour: null }],
        },
        orderBy: {
          id: 'desc',
        },
      });
    const now = moment();
    const workingHour = machineChecklistItem?.workingHour;
    let idleHour = 0;
    let breakdownHour = 0;

    if (machine.status === 'Idle') {
      const fromDate = await this.prisma.machineHistory.findFirst({
        where: {
          machineStatus: 'Working',
          machineId: machine.id,
        },
        orderBy: {
          id: 'desc',
        },
      });
      const duration = moment.duration(now.diff(fromDate.createdAt));
      idleHour = duration.asHours();
    }
    if (machine.status === 'Breakdown') {
      const fromDate = await this.prisma.machineHistory.findFirst({
        where: {
          machineStatus: 'Working',
          machineId: machine.id,
        },
        orderBy: {
          id: 'desc',
        },
      });
      const duration = moment.duration(now.diff(fromDate.createdAt));
      breakdownHour = duration.asHours();
    }

    await this.prisma.machineHistory.create({
      data: {
        machineId: machineHistory.machineId,
        type: machineHistory.type,
        description: machineHistory.description,
        completedById: machineHistory.completedById,
        machineStatus: machineHistory.machineStatus
          ? machineHistory.machineStatus
          : machine.status,
        machineType: machine.type,
        workingHour: workingHour ? workingHour : 0,
        idleHour: idleHour,
        breakdownHour: breakdownHour,
        location: machine.location,
      },
    });
  }

  //** Create machine history in background */
  async createMachineHistoryInBackground(
    machineHistory: MachineHistoryInterface
  ) {
    await this.machineHistoryQueue.add('createMachineHistory', {
      machineHistory,
    });
  }

  //** Delete machine attachment. */
  async deleteMachineAttachment(id: number, user: User) {
    try {
      const attachment = await this.prisma.machineAttachment.findFirst({
        where: { id },
        select: {
          id: true,
          machineId: true,
          description: true,
        },
      });
      const machineUsers = await this.getMachineUserIds(
        attachment.machineId,
        user.id
      );
      for (let index = 0; index < machineUsers.length; index++) {
        await this.notificationService.createInBackground({
          userId: machineUsers[index],
          body: `${user.fullName} (${user.rcno}) deleted attachment (${attachment.id}) on machine ${attachment.machineId}`,
          link: `/machine/${attachment.machineId}`,
        });
      }
      await this.createMachineHistoryInBackground({
        type: 'Attachment Delete',
        description: `(${id}) Attachment (${attachment.description}) deleted.`,
        machineId: attachment.machineId,
        completedById: user.id,
      });
      await this.prisma.machineAttachment.delete({
        where: { id },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Edit machine attachment */
  async editMachineAttachment(user: User, id: number, description: string) {
    try {
      const attachment = await this.prisma.machineAttachment.findFirst({
        where: { id },
        select: {
          id: true,
          machineId: true,
          description: true,
        },
      });
      if (attachment.description != description) {
        await this.createMachineHistoryInBackground({
          type: 'Attachment Edit',
          description: `(${id}) Description changed from ${attachment.description} to ${description}.`,
          machineId: attachment.machineId,
          completedById: user.id,
        });
      }
      const machineUsers = await this.getMachineUserIds(
        attachment.machineId,
        user.id
      );
      for (let index = 0; index < machineUsers.length; index++) {
        await this.notificationService.createInBackground({
          userId: machineUsers[index],
          body: `${user.fullName} (${user.rcno}) edited attachment (${attachment.id}) on machine ${attachment.machineId}`,
          link: `/machine/${attachment.machineId}`,
        });
      }
      await this.prisma.machineAttachment.update({
        where: { id },
        data: { description },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Get machine report */
  async getMachineReport(user: User, from: Date, to: Date) {
    try {
      const fromDate = moment(from).startOf('day');
      const statusHistoryArray = [];
      const machineReportArray = [];
      const toDate = moment(to).endOf('day');

      //get all machines
      const machines = await this.prisma.machine.findMany({
        select: {
          id: true,
          type: true,
        },
      });

      //get all history of machine based on closest date
      for (let index = 0; index < machines.length; index++) {
        const statusHistory = await this.prisma.machineHistory.findFirst({
          where: {
            machineId: machines[index].id,
            createdAt: { lte: toDate.toDate() },
          },
          orderBy: {
            id: 'desc',
          },
        });
        statusHistoryArray.push(statusHistory);
      }

      //find all working and breakdown of machine type
      for (let i = 0; i < statusHistoryArray.length; i++) {
        let working = 0;
        let breakdown = 0;
        statusHistoryArray.find((e) => {
          if (
            e?.machineStatus == 'Working' &&
            e?.machineType == statusHistoryArray[i]?.machineType
          ) {
            working++;
          }
          if (
            e?.machineStatus == 'Breakdown' &&
            e?.machineType == statusHistoryArray[i]?.machineType
          ) {
            breakdown++;
          }
        });
        //if it exist then don't add to array
        let found = false;
        machineReportArray?.find((e) => {
          if (e.type == statusHistoryArray[i]?.machineType) {
            found = true;
          }
        });
        if (!found) {
          machineReportArray.push({
            type: statusHistoryArray[i]?.machineType,
            working: working,
            breakdown: breakdown,
          });
        }
      }
      return machineReportArray;
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  // Get unique array of ids of machine assigned users
  async getMachineUserIds(
    machineId: number,
    removeUserId?: number
  ): Promise<number[]> {
    // get all users involved in ticket
    const getAssignedUsers = await this.prisma.machineAssignment.findMany({
      where: {
        machineId,
      },
    });

    const combinedIDs = [...getAssignedUsers.map((a) => a.userId)];

    // get unique ids only
    const unique = [...new Set(combinedIDs)];

    // If removeUserId variable has not been passed, return array
    if (!removeUserId) {
      return unique;
    }

    // Otherwise remove the given user id from array and then return
    return unique.filter((id) => {
      return id != removeUserId;
    });
  }

  //check periodic maintenance every hour. notify based on the notification hour
  @Cron(CronExpression.EVERY_HOUR)
  async updatePeriodicMaintenanceStatus() {
    const now = moment();
    const periodicMaintenance =
      await this.prisma.machinePeriodicMaintenance.findMany({
        include: {
          machine: {
            select: {
              currentRunning: true,
            },
          },
        },
      });

    for (let index = 0; index < periodicMaintenance.length; index++) {
      const value = periodicMaintenance[index].value;

      //const fixedDate = moment(periodicMaintenance[index].fixedDate);
      const notifDate = moment(periodicMaintenance[index].startDate);
      if (periodicMaintenance[index].measurement === 'hour') {
        notifDate.add(value, 'h');
      } else if (periodicMaintenance[index].measurement === 'day') {
        notifDate.add(value, 'd');
      } else if (periodicMaintenance[index].measurement === 'km') {
        if (value >= periodicMaintenance[index].machine.currentRunning) {
          const users = await this.prisma.machineAssignment.findMany({
            where: {
              machineId: periodicMaintenance[index].machineId,
            },
          });
          for (let index = 0; index < users.length; index++) {
            await this.notificationService.createInBackground({
              userId: users[index].userId,
              body: `Periodic maintenance (${periodicMaintenance[index].id}) on machine ${periodicMaintenance[index].machineId} km reminder`,
              link: `/machine/${periodicMaintenance[index].machineId}`,
            });
          }
          await this.prisma.machinePeriodicMaintenance.update({
            where: {
              id: periodicMaintenance[index].id,
            },
            data: {
              startDate: moment(notifDate).format('DD MMMM YYYY HH:mm:ss'),
            },
          });
        }
      }
      //notifDate.add(notifHour, 'h');

      if (notifDate.isSame(now)) {
        const users = await this.prisma.machineAssignment.findMany({
          where: {
            machineId: periodicMaintenance[index].machineId,
          },
        });
        for (let index = 0; index < users.length; index++) {
          await this.notificationService.createInBackground({
            userId: users[index].userId,
            body: `Periodic maintenance (${periodicMaintenance[index].id}) on machine ${periodicMaintenance[index].machineId} reminder`,
            link: `/machine/${periodicMaintenance[index].machineId}`,
          });
        }
      }
    }
  }

  //** Get machine usage report*/
  async getMachineUsage(user: User, machineId: number, from: Date, to: Date) {
    try {
      const today = moment();
      const fromDate = moment(from).startOf('day');
      const toDate = moment(to).endOf('day');
      const key = `machineUsageHistoryByDate-${machineId}-${fromDate.format(
        'DD-MMMM-YYYY'
      )}-${toDate.format('DD-MMMM-YYYY')}`;
      let usageHistoryByDate = await this.redisCacheService.get(key);
      if (!usageHistoryByDate) {
        usageHistoryByDate = [];
        //get all usage of machine between date
        const machineUsageHistoryArray =
          await this.prisma.machineHistory.findMany({
            where: {
              machineId,
              createdAt: { gte: fromDate.toDate(), lte: toDate.toDate() },
            },
            orderBy: {
              id: 'desc',
            },
          });
        const days = toDate.diff(fromDate, 'days') + 1;
        for (let i = 0; i < days; i++) {
          const day = fromDate.clone().add(i, 'day');
          const workingHour =
            machineUsageHistoryArray.find((usage) =>
              moment(usage.createdAt).isSame(day, 'day')
            )?.workingHour ?? 0;
          const idleHour =
            machineUsageHistoryArray.find((usage) =>
              moment(usage.createdAt).isSame(day, 'day')
            )?.idleHour ?? 0;
          const breakdownHour =
            machineUsageHistoryArray.find((usage) =>
              moment(usage.createdAt).isSame(day, 'day')
            )?.breakdownHour ?? 0;
          usageHistoryByDate.push({
            date: day.toDate(),
            workingHour,
            idleHour,
            breakdownHour,
          });
        }
      }
      return usageHistoryByDate;
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Edit machine usage */
  async editMachineUsage(
    user: User,
    id: number,
    currentRunning: number,
    lastService: number
  ) {
    try {
      const machine = await this.prisma.machine.findFirst({
        where: { id },
      });
      if (machine.currentRunning != currentRunning) {
        await this.createMachineHistoryInBackground({
          type: 'Machine Edit',
          description: `Current Running changed from ${machine.currentRunning} to ${currentRunning}.`,
          machineId: id,
          completedById: user.id,
        });
      }
      if (machine.lastService != lastService) {
        await this.createMachineHistoryInBackground({
          type: 'Machine Edit',
          description: `Last Service changed from ${machine.lastService} to ${lastService}.`,
          machineId: id,
          completedById: user.id,
        });
      }

      const machineUsers = await this.getMachineUserIds(id, user.id);
      for (let index = 0; index < machineUsers.length; index++) {
        await this.notificationService.createInBackground({
          userId: machineUsers[index],
          body: `${user.fullName} (${user.rcno}) edited machine (${id})}`,
          link: `/machine/${id}`,
        });
      }
      const interService = currentRunning - lastService;
      await this.prisma.machine.update({
        data: {
          currentRunning,
          lastService,
          interService,
        },
        where: { id },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Create machine periodic maintenance Sub task. */
  async createMachinePeriodicMaintenanceTask(
    user: User,
    periodicMaintenanceId: number,
    name: string,
    parentTaskId?: number
  ) {
    try {
      // //get parent's parent's task
      // const task = await this.prisma.machinePeriodicMaintenanceTask.findFirst({
      //   where: {
      //     id: parentTaskId,
      //   },
      //   include: {
      //     parentTask: {
      //       include: {
      //         parentTask: {
      //           select: {
      //             id: true,
      //           },
      //         },
      //       },
      //     },
      //   },
      // });
      // //if it exists then don't create new task. Only 2 level of parents exist
      // if (task?.parentTask?.parentTask?.id) {
      //   throw new UnauthorizedException('Cannot add sub tasks to a sub task.');
      // }
      await this.prisma.machinePeriodicMaintenanceTask.create({
        data: {
          parentTaskId,
          periodicMaintenanceId,
          name,
        },
      });
      const machinePeriodicMaintenance =
        await this.prisma.machinePeriodicMaintenance.findFirst({
          where: {
            id: periodicMaintenanceId,
          },
          include: {
            machine: {
              select: {
                id: true,
              },
            },
          },
        });
      const machine = machinePeriodicMaintenance.machine;
      await this.createMachineHistoryInBackground({
        type: 'Add Sub task',
        description: `Added sub task to periodic maintenance (${periodicMaintenanceId})`,
        machineId: machine.id,
        completedById: user.id,
      });
      const machineUsers = await this.getMachineUserIds(machine.id, user.id);
      for (let index = 0; index < machineUsers.length; index++) {
        await this.notificationService.createInBackground({
          userId: machineUsers[index],
          body: `${user.fullName} (${user.rcno}) added new sub task in machine (${machine.id})'s periodic maintenance (${periodicMaintenanceId}) `,
          link: `/machine/${machine.id}`,
        });
      }
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Set task as complete or incomplete. */
  async toggleTask(user: User, id: number, complete: boolean) {
    const completion = complete
      ? { completedById: user.id, completedAt: new Date() }
      : { completedById: null, completedAt: null };
    let transactions: any = [
      this.prisma.machinePeriodicMaintenanceTask.update({
        where: { id },
        data: completion,
      }),
    ];
    const subTasks = await this.prisma.machinePeriodicMaintenanceTask.findMany({
      where: { parentTaskId: id },
      select: { id: true },
    });
    const subTaskIds = subTasks.map((st) => st.id);
    if (subTaskIds.length > 0) {
      transactions.push(
        this.prisma.machinePeriodicMaintenanceTask.updateMany({
          where: {
            OR: [
              { id: { in: subTaskIds } },
              { parentTaskId: { in: subTaskIds } },
            ],
          },
          data: completion,
        })
      );
    }
    try {
      await this.prisma.$transaction(transactions);
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Delete task. */
  async deleteTask(user: User, id: number) {
    try {
      await this.prisma.machinePeriodicMaintenanceTask.delete({
        where: { id },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //check breakdown every week. notify assigned users if breakdown exists
  @Cron(CronExpression.EVERY_WEEK)
  async checkMachineBreakdownExist() {
    const breakdown = await this.prisma.machineBreakdown.findMany();
    const now = moment().startOf('day');

    for (let index = 0; index < breakdown.length; index++) {
      if (breakdown[index].status === 'Breakdown') {
        const end = moment(breakdown[index].createdAt).endOf('day');

        if (moment.duration(end.diff(now)).asDays() >= 7) {
          const users = await this.prisma.machineAssignment.findMany({
            where: {
              machineId: breakdown[index].machineId,
            },
          });

          for (let index = 0; index < users.length; index++) {
            await this.notificationService.createInBackground({
              userId: users[index].userId,
              body: `Reminder: Machine ${breakdown[index].machineId} has been broken for 1 week`,
              link: `/machine/${breakdown[index].machineId}`,
            });
          }
          await this.createMachineHistoryInBackground({
            type: 'Breakdown',
            description: `(${breakdown[index].id}) breakdown has been notified to all assigned users.`,
            machineId: breakdown[index].machineId,
          });
        }
      }
    }
  }
}
