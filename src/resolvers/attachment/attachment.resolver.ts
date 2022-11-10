import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { PrismaService } from 'nestjs-prisma';
import { UserEntity } from 'src/decorators/user.decorator';
import { EntityAttachmentConnectionArgs } from 'src/entity/dto/args/entity-attachment-connection.args';
import { EntityAttachment } from 'src/entity/dto/models/entity-attachment.model';
import { PaginatedEntityAttachment } from 'src/entity/dto/paginations/entity-attachment-connection.model';
import { GqlAuthGuard } from 'src/guards/gql-auth.guard';
import { User } from 'src/models/user.model';
import { AttachmentService } from 'src/services/attachment.service';

@Resolver(() => EntityAttachment)
@UseGuards(GqlAuthGuard)
export class AttachmentResolver {
  constructor(
    private readonly attachmentService: AttachmentService,
    private prisma: PrismaService
  ) {}

  @Query(() => EntityAttachment)
  async entityAttachment(@Args('id') id: number): Promise<EntityAttachment> {
    return await this.prisma.entityAttachment.findFirst({
      where: { id },
    });
  }

  @Query(() => PaginatedEntityAttachment)
  async entityAttachments(
    @UserEntity() user: User,
    @Args() args: EntityAttachmentConnectionArgs
  ): Promise<PaginatedEntityAttachment> {
    return await this.attachmentService.getEntityAttachmentWithPagination(
      user,
      args
    );
  }

  @Query(() => EntityAttachment)
  async getLatestFavouriteAttachment(
    @Args('entityId') entityId: number
  ): Promise<EntityAttachment> {
    return await this.attachmentService.getLatestFavouriteAttachment(entityId);
  }

  @Mutation(() => String)
  async setFavouriteAttachment(
    @Args('id') id: number,
    @Args('flag') flag: boolean
  ): Promise<string> {
    await this.attachmentService.setFavouriteAttachment(id, flag);
    return `Successfuly updated favourite attachment`;
  }
}
