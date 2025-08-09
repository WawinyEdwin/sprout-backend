import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupabaseModule } from '../supabase/supabase.module';
import {
  Integration,
  IntegrationRequest,
  Metric,
  ProcessedIntegrationData,
  RawIntegrationDataEvent,
  WorkspaceIntegration,
} from './entities/integration.entity';
import { FacebookAdsService } from './facebook-ads/facebookads.service';
import { GoogleAnalyticsService } from './ga/googleanalytics.service';
import { GoogleAdsService } from './google-ads/googleads.service';
import { HubspotService } from './hubspot/hubspot.service';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { MailchimpService } from './mailchimp/mailchimp.service';
import { QuickbookService } from './quickbooks/quickbooks.service';
import { SalesforceService } from './salesforce/salesforce.service';
import { ShopifyService } from './shopify/shopify.service';
import { StripeService } from './stripe/stripe.service';
import { ZendeskService } from './zendesk/zendesk.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Integration,
      WorkspaceIntegration,
      Metric,
      RawIntegrationDataEvent,
      ProcessedIntegrationData,
      IntegrationRequest,
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
    SalesforceService,
    ShopifyService,
    QuickbookService,
    MailchimpService,
    HubspotService,
    ZendeskService,
  ],
  exports: [IntegrationsService],
})
export class IntegrationsModule {}
