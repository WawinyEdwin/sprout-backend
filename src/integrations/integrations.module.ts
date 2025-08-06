import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupabaseModule } from 'src/supabase/supabase.module';
import {
  Integration,
  Metric,
  ProcessedIntegrationData,
  RawIntegrationDataEvent,
  WorkspaceIntegration,
} from './entities/integration.entity';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { FacebookAdsService } from './services/facebookads.service';
import { GoogleAdsService } from './services/googleads.service';
import { GoogleAnalyticsService } from './services/googleanalytics.service';
import { HubspotService } from './services/hubspot.service';
import { MailchimpService } from './services/mailchimp.service';
import { QuickbookService } from './services/quickbooks.service';
import { SalesforceService } from './services/salesforce.service';
import { ShopifyService } from './services/shopify.service';
import { StripeService } from './services/stripe.service';
import { ZendeskService } from './services/zendesk.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Integration,
      WorkspaceIntegration,
      Metric,
      RawIntegrationDataEvent,
      ProcessedIntegrationData,
    ]),
    SupabaseModule,
    HttpModule,
  ],
  controllers: [IntegrationsController],
  providers: [
    IntegrationsService,
    GoogleAnalyticsService,
    GoogleAdsService,
    FacebookAdsService,
    StripeService,
    ZendeskService,
    MailchimpService,
    SalesforceService,
    ShopifyService,
    HubspotService,
    QuickbookService,
  ],
})
export class IntegrationsModule {}
