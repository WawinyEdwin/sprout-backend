import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import configuration, { validationSchema } from './config/configuration';
import { DataPipelinesModule } from './data-pipelines/data-pipelines.module';
import { DataboardsModule } from './databoards/databoards.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { KpiModule } from './kpi/kpi.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { SupabaseModule } from './supabase/supabase.module';
import { SupabaseService } from './supabase/supabase.service';
import { UserModule } from './users/users.module';
import { WorkspacesModule } from './workspaces/workspaces.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [configuration],
      validationSchema,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      autoLoadEntities: true,
      synchronize: process.env.NODE_ENV === 'production' ? false : true,
      // logging: process.env.NODE_ENV === 'production' ? false : true,
    }),
    ScheduleModule.forRoot(),
    UserModule,
    AuthModule,
    SupabaseModule,
    IntegrationsModule,
    SubscriptionsModule,
    ChatModule,
    DataboardsModule,
    WorkspacesModule,
    KpiModule,
    SchedulerModule,
    DataPipelinesModule,
  ],
  providers: [SupabaseService],
})
export class AppModule {}
