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
import { InterServiceColorModule } from './inter-service-color/inter-service-color.module';
import { UserAssignmentModule } from './user-assignment/user-assignment.module';
import { EngineModule } from './engine/engine.module';

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
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        // Get Redis connection details from environment variables
        const redisUrl = process.env.REDIS_URL;
        console.log(`Redis URL for Bull: ${redisUrl}`);

        // Default values
        let host = 'localhost';
        let port = 6379;

        // Parse Redis URL if it's available and not localhost
        if (redisUrl && redisUrl !== 'redis://localhost:6379') {
          try {
            const match = redisUrl.match(/redis:\/\/([^:]+):(\d+)/);
            if (match) {
              host = match[1];
              port = parseInt(match[2], 10);
            }
          } catch (err) {
            console.error(`Failed to parse Redis URL for Bull: ${err.message}`);
          }
        }

        console.log(`Connecting Bull to Redis at host: ${host}, port: ${port}`);

        // Return explicit host and port configuration
        return {
          redis: {
            host,
            port,
          },
        };
      },
      inject: [ConfigService],
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
    InterServiceColorModule,
    UserAssignmentModule,
    EngineModule,
  ],
  providers: [DateScalar, InitService],
})
export class AppModule {}
