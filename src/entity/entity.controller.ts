import {
  Controller,
  Get,
  Header,
  UseGuards,
  Param,
  Query,
  Post,
  Body,
} from '@nestjs/common';
import { Permissions } from 'src/decorators/permissions.decorator';
import { KeyGuard } from 'src/guards/key.guard';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { EntityTransferInput } from './dto/args/entity-transfer.input';
import { UnassignExternalInput } from './dto/args/unassign-external.input';
import { EntityService } from './entity.service';

@UseGuards(KeyGuard, PermissionsGuard)
@Controller('entity')
export class EntityController {
  constructor(private entityService: EntityService) {}

  @Permissions('VIEW_ALL_ENTITY')
  @Get('search')
  @Header('Content-Type', 'application/json')
  async entitySearch(@Query() query): Promise<Object> {
    let entityIds = query.entityIds?.split(',');
    entityIds = entityIds?.map((id) => parseInt(id));
    const results = await this.entityService.search(
      query.query ?? '',
      entityIds ?? undefined,
      query.limit ? parseInt(query.limit) : undefined,
      query.entityType ?? undefined
    );
    return JSON.stringify(results, null, '\t');
  }

  @Permissions('VIEW_ALL_ENTITY')
  @Get(':id')
  @Header('Content-Type', 'application/json')
  async entity(@Param() params): Promise<Object> {
    const id = parseInt(params.id);
    const results = await this.entityService.findOne(id);
    return JSON.stringify(results, null, '\t');
  }

  @Permissions('EDIT_ENTITY')
  @Post('transfer')
  @Header('Content-Type', 'application/json')
  async entityTransfer(@Body() input: EntityTransferInput): Promise<Object> {
    const results = await this.entityService.entityTransfer(input);
    return JSON.stringify(results, null, '\t');
  }

  @Permissions('ASSIGN_TO_ENTITY')
  @Post('unassign')
  @Header('Content-Type', 'application/json')
  async unassign(@Body() input: UnassignExternalInput): Promise<Object> {
    const results = await this.entityService.unassignFromEntityExternal(input);
    return JSON.stringify(results, null, '\t');
  }

  @Permissions('EDIT_ENTITY')
  @Post('status')
  @Header('Content-Type', 'application/json')
  async setEntityStatus(@Body() input): Promise<Object> {
    const results = await this.entityService.setEntityStatus(
      parseInt(input.entityId),
      input.status,
      null,
      input.requestingUserUuid
    );
    return JSON.stringify(results, null, '\t');
  }
}
