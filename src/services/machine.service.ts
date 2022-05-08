import { PrismaService } from 'nestjs-prisma';
import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Prisma, SparePRStatus, User } from '@prisma/client';
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

export interface MachineHistoryInterface {
  machineId: number;
  type: string;
  description: string;
  completedById?: number;
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
    currentRunningHrs: number,
    lastServiceHrs: number,
    registeredDate?: Date
  ) {
    try {
      const interServiceHrs = currentRunningHrs - lastServiceHrs;
      await this.prisma.machine.create({
        data: {
          createdById: user.id,
          machineNumber,
          model,
          type,
          zone,
          location,
          currentRunningHrs,
          lastServiceHrs,
          interServiceHrs,
          registeredDate,
        },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Delete machine. */
  async deleteMachine(id: number) {
    try {
      await this.prisma.machine.delete({
        where: { id },
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
    currentRunningHrs: number,
    lastServiceHrs: number,
    registeredDate: Date
  ) {
    try {
      await this.prisma.machine.update({
        data: {
          machineNumber,
          model,
          type,
          zone,
          location,
          currentRunningHrs,
          lastServiceHrs,
          registeredDate,
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
      //put condition for status done later
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
      await this.prisma.machine.update({
        where: { id: machineId },
        data: { status, statusChangedAt: new Date() },
      });
      await this.createMachineHistoryInBackground({
        type: 'Status Change',
        description: `${user.fullName} (${user.rcno}) set status to ${status}`,
        machineId: machineId,
        completedById: user.id,
      });
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
        sparePRs: { orderBy: { id: 'desc' } },
        repairs: { orderBy: { id: 'desc' } },
        breakdowns: { orderBy: { id: 'desc' } },
        histories: true,
        attachments: true,
      },
    });
    if (!machine) throw new BadRequestException('Machine not found.');

    // Assigning data from db to the gql shape as it does not match 1:1
    return machine;
  }

  //** Get machine. Results are paginated. User cursor argument to go forward/backward. */
  async getMachineWithPagination(
    user: User,
    args: MachineConnectionArgs
  ): Promise<PaginatedMachine> {
    const { limit, offset } = getPagingParameters(args);
    const limitPlusOne = limit + 1;
    const { createdById, search, assignedToId } = args;

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
        type: 'Checklist',
        description: `${user.fullName} (${user.rcno}) added new checklist`,
        machineId: machineId,
        completedById: user.id,
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Edit machine checklist item. */
  async editMachineChecklistItem(
    user: User,
    id: number,
    description: string,
    type: string
  ) {
    try {
      await this.prisma.machineChecklistItem.update({
        where: { id },
        data: { description, type },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Delete machine checklist item. */
  async deleteMachineChecklistItem(user: User, id: number) {
    try {
      await this.prisma.machineChecklistItem.delete({
        where: { id },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Set checklist item as complete or incomplete. */
  async toggleMachineChecklistItem(user: User, id: number, complete: boolean) {
    //no user context yet
    try {
      await this.prisma.machineChecklistItem.update({
        where: { id },
        data: complete
          ? { completedById: 1, completedAt: new Date() }
          : { completedById: null, completedAt: null },
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
    period: number,
    notificationReminder: number
  ) {
    try {
      await this.prisma.machinePeriodicMaintenance.create({
        data: {
          machineId,
          title,
          description,
          period,
          notificationReminder,
        },
      });
      await this.createMachineHistoryInBackground({
        type: 'Perioidic Maintenance',
        description: `${user.fullName} (${user.rcno}) added new periodic maintenance`,
        machineId: machineId,
        completedById: user.id,
      });
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
    period: number,
    notificationReminder: number
  ) {
    try {
      await this.prisma.machinePeriodicMaintenance.update({
        where: { id },
        data: { title, description, period, notificationReminder },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Delete machine periodic maintenance. */
  async deleteMachinePeriodicMaintenance(user: User, id: number) {
    try {
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
      //put condition for status done later
      let completedFlag = false;
      if (status == 'Done') {
        completedFlag = true;
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
      await this.prisma.machineRepair.create({
        data: {
          machineId,
          title,
          description,
        },
      });
      await this.createMachineHistoryInBackground({
        type: 'Repair',
        description: `${user.fullName} (${user.rcno}) added new repair`,
        machineId: machineId,
        completedById: user.id,
      });
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
      //put condition for status done later
      await this.prisma.machineRepair.update({
        where: { id },
        data: { status },
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
      await this.prisma.machineSparePR.create({
        data: {
          machineId,
          requestedDate,
          title,
          description,
        },
      });
      await this.createMachineHistoryInBackground({
        type: 'Spare PR',
        description: `${user.fullName} (${user.rcno}) added new spare PR`,
        machineId: machineId,
        completedById: user.id,
      });
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
      //put condition for status done later
      let completedFlag = false;
      if (status == 'Done') {
        completedFlag = true;
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
      await this.prisma.machineBreakdown.create({
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
        type: 'Breakdown',
        description: `${user.fullName} (${user.rcno}) added new breakdown`,
        machineId: machineId,
        completedById: user.id,
      });
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
    description: string
  ) {
    try {
      await this.prisma.machineBreakdown.update({
        where: { id },
        data: { title, description },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Delete machine breakdown */
  async deleteMachineBreakdown(user: User, id: number) {
    try {
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
      //get machine ID
      const machine = await this.prisma.machineBreakdown.findFirst({
        where: { id },
        select: {
          machineId: true,
        },
      });
      let machineStatus;
      if (status == 'Done') {
        machineStatus = 'Working';
      } else if (status == 'Pending') {
        machineStatus = 'Pending';
      } else if (status == 'Breakdown') {
        machineStatus = 'Breakdown';
      }
      //set machine status
      await this.prisma.machine.update({
        where: { id: machine.machineId },
        data: { status: machineStatus },
      });

      //set machine breakdown status
      await this.prisma.machineBreakdown.update({
        where: { id },
        data: { status },
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
      include: {
        machine: true,
      },
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
        machine: true,
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
    // Check for roles later

    try {
      await this.prisma.machineAssignment.createMany({
        data: userIds.map((userId, index) => ({
          machineId,
          userId: userId,
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

  //** Get machine. Results are paginated. User cursor argument to go forward/backward. */
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
    await this.prisma.machineHistory.create({
      data: {
        machineId: machineHistory.machineId,
        type: machineHistory.type,
        description: machineHistory.description,
        completedById: machineHistory.completedById,
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
  async deleteMachineAttachment(id: number) {
    try {
      await this.prisma.machineAttachment.delete({
        where: { id },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  //** Edit machine breakdown */
  async editMachineAttachment(user: User, id: number, description: string) {
    try {
      await this.prisma.machineAttachment.update({
        where: { id },
        data: { description },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }
}
