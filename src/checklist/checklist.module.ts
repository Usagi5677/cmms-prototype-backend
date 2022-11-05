import { Module, forwardRef } from '@nestjs/common';
import { ChecklistService } from './checklist.service';
import { ChecklistResolver } from './checklist.resolver';
import { ChecklistTemplateModule } from 'src/resolvers/checklist-template/checklist-template.module';
import { EntityModule } from 'src/entity/entity.module';
import { ChecklistController } from './checklist.controller';
import { AuthModule } from 'src/resolvers/auth/auth.module';
import { AttachmentModule } from 'src/resolvers/attachment/attachment.module';

@Module({
  providers: [ChecklistResolver, ChecklistService],
  imports: [
    ChecklistTemplateModule,
    forwardRef(() => EntityModule),
    forwardRef(() => AttachmentModule),
    AuthModule,
  ],
  exports: [ChecklistService],
  controllers: [ChecklistController],
})
export class ChecklistModule {}
