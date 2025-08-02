import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupabaseModule } from 'src/supabase/supabase.module';
import {
  Integration,
  Metric,
  UserIntegration,
} from './entities/integration.entity';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { GoogleAdsService } from './services/googleads.service';
import { GoogleAnalyticsService } from './services/googleanalytics.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Integration, UserIntegration, Metric]),
    SupabaseModule,
    HttpModule,
  ],
  controllers: [IntegrationsController],
  providers: [IntegrationsService, GoogleAnalyticsService, GoogleAdsService],
})
export class IntegrationsModule {}
