import { Module } from '@nestjs/common';
import { AssignmentService } from './assignment.service';
import { AssignmentResolver } from './assignment.resolver';
import { EntityModule } from 'src/entity/entity.module';
import { UserModule } from 'src/resolvers/user/user.module';

@Module({
  providers: [AssignmentResolver, AssignmentService],
  imports: [EntityModule, UserModule],
})
export class AssignmentModule {}
