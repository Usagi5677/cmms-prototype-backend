import { Module } from '@nestjs/common';
import { AssignmentService } from './assignment.service';
import { AssignmentResolver } from './assignment.resolver';
import { EntityModule } from 'src/entity/entity.module';

@Module({
  providers: [AssignmentResolver, AssignmentService],
  imports: [EntityModule],
})
export class AssignmentModule {}
