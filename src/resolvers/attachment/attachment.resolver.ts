import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { PrismaService } from 'nestjs-prisma';
import { UserEntity } from 'src/decorators/user.decorator';
import { GqlAuthGuard } from 'src/guards/gql-auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { MachineAttachmentConnectionArgs } from 'src/models/args/machine-attachment-connection.args';
import { TransportationAttachmentConnectionArgs } from 'src/models/args/transportation-attachment-connection.args';
import { MachineAttachment } from 'src/models/machine-attachment.model';
import { PaginatedMachineAttachment } from 'src/models/pagination/machine-attachment-connection.model';
import { PaginatedTransportationAttachment } from 'src/models/pagination/transportation-attachment-connection.model';
import { TransportationAttachment } from 'src/models/transportation-attachment.model';
import { User } from 'src/models/user.model';
import { AttachmentService } from 'src/services/attachment.service';

@Resolver(() => MachineAttachment)
@UseGuards(GqlAuthGuard, RolesGuard)
export class AttachmentResolver {
  constructor(
    private readonly attachmentService: AttachmentService,
    private prisma: PrismaService
  ) {}

  @Query(() => MachineAttachment)
  async machineAttachment(@Args('id') id: number): Promise<MachineAttachment> {
    return await this.prisma.machineAttachment.findFirst({ where: { id } });
  }

  @Query(() => PaginatedMachineAttachment)
  async machineAttachments(
    @UserEntity() user: User,
    @Args() args: MachineAttachmentConnectionArgs
  ): Promise<PaginatedMachineAttachment> {
    return await this.attachmentService.getMachineAttachmentWithPagination(
      user,
      args
    );
  }

  @Query(() => TransportationAttachment)
  async transportationAttachment(
    @Args('id') id: number
  ): Promise<TransportationAttachment> {
    return await this.prisma.transportationAttachment.findFirst({
      where: { id },
    });
  }

  @Query(() => PaginatedTransportationAttachment)
  async transportationAttachments(
    @UserEntity() user: User,
    @Args() args: TransportationAttachmentConnectionArgs
  ): Promise<PaginatedTransportationAttachment> {
    return await this.attachmentService.getTransportationAttachmentWithPagination(
      user,
      args
    );
  }
}
