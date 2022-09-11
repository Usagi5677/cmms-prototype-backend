import { Controller, Get, Header, UseGuards, Param } from '@nestjs/common';
import { Permissions } from 'src/decorators/permissions.decorator';
import { KeyGuard } from 'src/guards/key.guard';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { TypeService } from './type.service';

@UseGuards(KeyGuard, PermissionsGuard)
@Controller('type')
export class TypeController {
  constructor(private typeService: TypeService) {}

  @Permissions('MODIFY_TYPES')
  @Get()
  @Header('Content-Type', 'application/json')
  async types(): Promise<Object> {
    const results = await this.typeService.findEvery();
    return JSON.stringify(results, null, '\t');
  }

  @Permissions('MODIFY_TYPES')
  @Get(':id')
  @Header('Content-Type', 'application/json')
  async type(@Param() params): Promise<Object> {
    const id = parseInt(params.id);
    const results = await this.typeService.findOne(id);
    return JSON.stringify(results, null, '\t');
  }
}
