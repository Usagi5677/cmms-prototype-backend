import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { PrismaService } from 'nestjs-prisma';
import { UserEntity } from 'src/decorators/user.decorator';
import { GqlAuthGuard } from 'src/guards/gql-auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { MachineAttachmentConnectionArgs } from 'src/models/args/machine-attachment-connection.args';
import { MachineAttachment } from 'src/models/machine-attachment.model';
import { PaginatedMachineAttachment } from 'src/models/pagination/machine-attachment-connection.model';
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
}
