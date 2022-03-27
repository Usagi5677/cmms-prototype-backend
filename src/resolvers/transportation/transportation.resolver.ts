import {
  InternalServerErrorException,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  Args,
  Int,
  Mutation,
  Query,
  Resolver,
  Subscription,
} from '@nestjs/graphql';
import { GqlAuthGuard } from '../../guards/gql-auth.guard';
import { Roles } from 'src/decorators/roles.decorator';
import { RolesGuard } from 'src/guards/roles.guard';
import { UserEntity } from 'src/decorators/user.decorator';
import { User } from 'src/models/user.model';
import { UserService } from 'src/services/user.service';
import { PrismaService } from 'nestjs-prisma';
import { Transportation } from 'src/models/transportation.model';
import { TransportationService } from 'src/services/transportation.service';
import { TransportationConnectionArgs } from 'src/models/args/transportation-connection.args';
import { PaginatedTransportation } from 'src/models/pagination/transportation-connection.model';

@Resolver(() => Transportation)
export class TransportationResolver {
  constructor(
    private transportationService: TransportationService,
    private userService: UserService,
    private prisma: PrismaService
  ) {}

  @Mutation(() => String)
  async createTransportation(
    @UserEntity() user: User,
    @Args('machineNumber') machineNumber: string,
    @Args('model') model: string,
    @Args('type') type: string,
    @Args('location') location: string,
    @Args('department') department: string,
    @Args('engine') engine: string,
    @Args('measurement') measurement: string,
    @Args('currentMileage') currentMileage: number,
    @Args('lastServiceMileage') lastServiceMileage: number
  ): Promise<String> {
    await this.transportationService.createTransportation(
      user,
      machineNumber,
      model,
      type,
      location,
      department,
      engine,
      measurement,
      currentMileage,
      lastServiceMileage
    );
    return `Successfully created transportation.`;
  }

  @Mutation(() => String)
  async removeTransportation(
    @Args('transportationId') transportationId: number
  ): Promise<String> {
    try {
      await this.transportationService.deleteTransportation(transportationId);
      return `Transportation removed.`;
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Unexpected error occured.');
    }
  }

  @Mutation(() => String)
  async editTransportation(
    @Args('id') id: number,
    @Args('machineNumber') machineNumber: string,
    @Args('model') model: string,
    @Args('type') type: string,
    @Args('location') location: string,
    @Args('department') department: string,
    @Args('engine') engine: string,
    @Args('measurement') measurement: string,
    @Args('currentMileage') currentMileage: number,
    @Args('lastServiceMileage') lastServiceMileage: number
  ): Promise<String> {
    await this.transportationService.editTransportation(
      id,
      machineNumber,
      model,
      type,
      location,
      department,
      engine,
      measurement,
      currentMileage,
      lastServiceMileage
    );
    return `Transportation updated.`;
  }

  @Query(() => PaginatedTransportation)
  async getAllTransportation(
    @UserEntity() user: User,
    @Args() args: TransportationConnectionArgs
  ): Promise<PaginatedTransportation> {
    return await this.transportationService.getTransportationWithPagination(
      user,
      args
    );
  }

  @Mutation(() => String)
  async addTransportationChecklistItem(
    @UserEntity() user: User,
    @Args('transportationId') transportationId: number,
    @Args('description') description: string,
    @Args('type') type: string
  ): Promise<String> {
    await this.transportationService.createTransportationChecklistItem(
      user,
      transportationId,
      description,
      type
    );
    return `Added checklist item to transportation.`;
  }

  @Mutation(() => String)
  async editTransportationChecklistItem(
    @UserEntity() user: User,
    @Args('id') id: number,
    @Args('description') description: string,
    @Args('type') type: string
  ): Promise<String> {
    await this.transportationService.editTransportationChecklistItem(
      user,
      id,
      description,
      type
    );
    return `Checklist item updated.`;
  }

  @Mutation(() => String)
  async deleteTransportationChecklistItem(
    @UserEntity() user: User,
    @Args('id') id: number
  ): Promise<String> {
    await this.transportationService.deleteTransportationChecklistItem(
      user,
      id
    );
    return `Checklist item deleted.`;
  }

  @Mutation(() => String)
  async toggleTransportationChecklistItem(
    @UserEntity() user: User,
    @Args('id') id: number,
    @Args('complete') complete: boolean
  ): Promise<String> {
    await this.transportationService.toggleTransportationChecklistItem(
      user,
      id,
      complete
    );
    return `Checklist item updated.`;
  }
}
