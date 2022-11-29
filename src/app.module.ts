import { GraphQLModule } from '@nestjs/graphql';
import { Module, UnauthorizedException } from '@nestjs/common';
import { AuthModule } from './resolvers/auth/auth.module';
import { UserModule } from './resolvers/user/user.module';
import { DateScalar } from './common/scalars/date.scalar';
import { ConfigModule, ConfigService } from '@nestjs/config';
import config from './configs/config';
import { GraphqlConfig } from './configs/config.interface';
import { PrismaModule } from 'nestjs-prisma';
import { BullModule } from '@nestjs/bull';
import jwtDecode from 'jwt-decode';
import { PubsubModule } from './resolvers/pubsub/pubsub.module';
import { ScheduleModule } from '@nestjs/schedule';
import { AttachmentModule } from './resolvers/attachment/attachment.module';
import { PermissionRoleModule } from './resolvers/permissionRole/permissionRole.module';
import { ChecklistTemplateModule } from './resolvers/checklist-template/checklist-template.module';
import { ChecklistModule } from './checklist/checklist.module';
import { InitService } from './services/init.service';
import { EntityModule } from './entity/entity.module';
import { TypeModule } from './type/type.module';
import { PermissionModule } from './permission/permission.module';
import { LocationModule } from './location/location.module';
import { PeriodicMaintenanceModule } from './periodic-maintenance/periodic-maintenance.module';
import { ZoneModule } from './zone/zone.module';
import { ApiKeyModule } from './api-key/api-key.module';
import { AssignmentModule } from './assignment/assignment.module';
import { BreakdownModule } from './breakdown/breakdown.module';
import { RepairModule } from './repair/repair.module';
import { SparePrModule } from './spare-pr/spare-pr.module';
import { DivisionModule } from './division/division.module';
import { HullTypeModule } from './hull-type/hull-type.module';
import { BrandModule } from './brand/brand.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [config] }),
    GraphQLModule.forRootAsync({
      useFactory: async (configService: ConfigService) => {
        const graphqlConfig = configService.get<GraphqlConfig>('graphql');
        return {
          installSubscriptionHandlers: true,
          buildSchemaOptions: {
            numberScalarMode: 'integer',
          },
          sortSchema: graphqlConfig.sortSchema,
          autoSchemaFile:
            graphqlConfig.schemaDestination || './src/schema.graphql',
          debug: graphqlConfig.debug,
          playground: graphqlConfig.playgroundEnabled,
          introspection: graphqlConfig.playgroundEnabled,
          context: ({ req }) => ({ req }),
          subscriptions: {
            'subscriptions-transport-ws': {
              onConnect: (connectionParams: { authToken: any }) => {
                const authHeader = connectionParams.authToken;
                if (!authHeader) throw new UnauthorizedException();
                const token = authHeader.split('Bearer ')[1];
                if (!token) throw new UnauthorizedException();
                const decoded = jwtDecode(token);
                if (!decoded) throw new UnauthorizedException();
                return decoded;
              },
            },
          },
        };
      },
      inject: [ConfigService],
    }),
    PrismaModule.forRoot({
      isGlobal: true,
    }),
    BullModule.forRoot({
      redis: {
        host: 'localhost',
        port: 6379,
      },
    }),
    PubsubModule,
    AuthModule,
    UserModule,
    AttachmentModule,
    PermissionRoleModule,
    ScheduleModule.forRoot(),
    ChecklistTemplateModule,
    ChecklistModule,
    EntityModule,
    TypeModule,
    PermissionModule,
    LocationModule,
    PeriodicMaintenanceModule,
    ZoneModule,
    BreakdownModule,
    RepairModule,
    ApiKeyModule,
    AssignmentModule,
    SparePrModule,
    DivisionModule,
    HullTypeModule,
    BrandModule,
  ],
  providers: [DateScalar, InitService],
})
export class AppModule {}
