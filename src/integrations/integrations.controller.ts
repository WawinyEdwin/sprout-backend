import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { AuthGuard } from '../auth/guards/auth.guard';
import { UpdateWorkspaceIntegrationDto } from './dto/update-workspaceintegration.dto';
import { FacebookAdsService } from './facebook-ads/facebookads.service';
import { GoogleAnalyticsService } from './ga/googleanalytics.service';
import { GoogleAdsService } from './google-ads/googleads.service';
import { HubspotService } from './hubspot/hubspot.service';
import { IOAuthInfo } from './integration.types';
import { IntegrationsService } from './integrations.service';
import { MailchimpService } from './mailchimp/mailchimp.service';
import { QuickbookService } from './quickbooks/quickbooks.service';
import { SalesforceService } from './salesforce/salesforce.service';
import { ShopifyService } from './shopify/shopify.service';
import { StripeService } from './stripe/stripe.service';
import { ZendeskService } from './zendesk/zendesk.service';

@Controller('integrations')
export class IntegrationsController {
  private readonly logger = new Logger(IntegrationsController.name);
  private readonly oauthSuccessUri: string;
  private readonly oauthErrorUri: string;
  private readonly frontendUrl: string;

  constructor(
    private readonly integrationsService: IntegrationsService,
    private readonly googleAnalyticsService: GoogleAnalyticsService,
    private readonly googleAdsService: GoogleAdsService,
    private readonly facebookAdsService: FacebookAdsService,
    private readonly quickbookService: QuickbookService,
    private readonly stripeService: StripeService,
    private readonly shopifyService: ShopifyService,
    private readonly salesforceService: SalesforceService,
    private readonly configService: ConfigService,
    private readonly mailchimpService: MailchimpService,
    private readonly hubspotService: HubspotService,
    private readonly zendeskService: ZendeskService,
  ) {
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL')!;
    this.oauthSuccessUri = `${this.frontendUrl}/dashboard/sources?connect=success`;
    this.oauthErrorUri = `${this.frontendUrl}/dashboard/sources?connect=error`;
  }

  @Get()
  @UseGuards(AuthGuard)
  findAll() {
    return this.integrationsService.findAll();
  }

  @Get('sync')
  @UseGuards(AuthGuard)
  async syncIntegration(
    @Body()
    payload: {
      workspaceId: string;
      workspaceIntegrationId: string;
      propertyId?: string;
    },
  ) {
    const integration =
      await this.integrationsService.findWorkspaceIntegrationByWorkspaceId(
        payload.workspaceId,
        payload.workspaceIntegrationId,
      );

    const rawAuthData = integration.authData;
    if (!rawAuthData) {
      throw new BadRequestException(
        'Missing auth information for this integration',
      );
    }

    const authData = rawAuthData as IOAuthInfo;

    if (!authData.accessToken) {
      throw new BadRequestException(
        'No access token found for this integration',
      );
    }

    const serviceMap = {
      google_analytics: this.googleAnalyticsService,
      quick_books: this.quickbookService,
      facebook_ads: this.facebookAdsService,
      salesforce: this.salesforceService,
      google_ads: this.googleAdsService,
    };

    const handler = serviceMap[integration.integration.key];
    if (!handler || !handler.sync) {
      throw new BadRequestException('Unsupported integration for sync');
    }

    return await handler.syncData(payload);
  }

  @Get('user')
  @UseGuards(AuthGuard)
  async workspaceIntegrations(@Query('workspaceId') workspaceId: string) {
    return this.integrationsService.workspaceIntegrations(workspaceId);
  }

  @Patch('user/:integrationId')
  @UseGuards(AuthGuard)
  async updateWorkspaceIntegration(
    @Param('integrationId') integrationId: string,
    @Body() updateWorkspaceIntegrationDto: UpdateWorkspaceIntegrationDto,
  ) {
    return await this.integrationsService.updateWorkspaceIntegration(
      integrationId,
      updateWorkspaceIntegrationDto,
    );
  }

  @Patch('disconnect/:workspaceIntergrationId')
  @UseGuards(AuthGuard)
  async disconnectIntegration(
    @Param('userIntergrationId') userIntergrationId: string,
  ) {
    return await this.integrationsService.disconnectIntegration(
      userIntergrationId,
    );
  }

  @Get('ga/connect')
  @UseGuards(AuthGuard)
  generateURL(@Query('workspaceId') workspaceId: string) {
    return this.googleAnalyticsService.generateAuthUrl(workspaceId);
  }

  @Get('ga/authorize/google/callback')
  async googleAnalyticsCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    try {
      await this.googleAnalyticsService.googleCallback(code, state);
      res.redirect(this.oauthSuccessUri);
    } catch (error) {
      this.logger.error(
        'Google Analytics OAuth callback failed:',
        error.stack || error,
      );
      res.redirect(this.oauthErrorUri);
    }
  }

  @Post('ga/properties')
  @UseGuards(AuthGuard)
  async gaProperties(
    @Body() payload: { workspaceId: string; workspaceIntegrationId: string },
  ) {
    return await this.googleAnalyticsService.getGoogleAnalyticsProperties(
      payload.workspaceId,
      payload.workspaceIntegrationId,
    );
  }

  @Get('google-ads/connect')
  @UseGuards(AuthGuard)
  generateAdsURL(@Query('workspaceId') workspaceId: string) {
    return this.googleAdsService.generateAuthUrl(workspaceId);
  }

  @Get('google-ads/authorize/google/callback')
  async googleAdsCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    try {
      await this.googleAdsService.googleCallback(code, state);
      res.redirect(this.oauthSuccessUri);
    } catch (error) {
      res.redirect(this.oauthErrorUri);
    }
  }

  @Get('facebook-ads/connect')
  @UseGuards(AuthGuard)
  generatefbURL(@Query('workspaceId') workspaceId: string) {
    return this.facebookAdsService.generateAuthUrl(workspaceId);
  }

  @Get('facebook-ads/authorize/fb/callback')
  async facebookAdsCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    try {
      await this.facebookAdsService.facebookCallback(code, state);
      res.redirect(this.oauthSuccessUri);
    } catch (error) {
      this.logger.error('FB OAuth callback failed:', error.stack || error);
      res.redirect(this.oauthErrorUri);
    }
  }

  @Get('stripe/connect')
  @UseGuards(AuthGuard)
  generateStripeURL(@Query('workspaceId') workspaceId: string) {
    return this.stripeService.generateAuthUrl(workspaceId);
  }

  @Get('stripe/authorize/stripe/callback')
  async stripeCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    try {
      await this.stripeService.stripeCallback(code, state);
      res.redirect(this.oauthSuccessUri);
    } catch (error) {
      res.redirect(this.oauthErrorUri);
    }
  }

  @Get('quickbooks/connect')
  @UseGuards(AuthGuard)
  generateQuickBooksURL(@Query('workspaceId') workspaceId: string) {
    return this.quickbookService.generateAuthUrl(workspaceId);
  }

  @Get('quickbooks/authorize/quickbooks/callback')
  async quickbookCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('realmId') realmId: string,
    @Res() res: Response,
  ) {
    try {
      await this.quickbookService.quickbookCallback(code, state, realmId);
      res.redirect(this.oauthSuccessUri);
    } catch (error) {
      this.logger.error(
        'Quickbooks OAuth callback failed:',
        error.stack || error,
      );
      res.redirect(this.oauthErrorUri);
    }
  }

  @Get('shopify/connect')
  @UseGuards(AuthGuard)
  generateShopifyURL(
    @Query('workspaceId') workspaceId: string,
    @Query('shop') shop: string,
  ) {
    return this.shopifyService.generateAuthUrl(workspaceId, shop);
  }

  @Get('shopify/authorize/shopify/callback')
  async shopifyCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    try {
      await this.shopifyService.shopifyCallback(code, state);
      res.redirect(this.oauthSuccessUri);
    } catch (error) {
      this.logger.error('Shopify OAuth callback failed:', error.stack || error);
      res.redirect(this.oauthErrorUri);
    }
  }

  @Get('salesforce/connect')
  @UseGuards(AuthGuard)
  generateSalesforceURL(@Query('workspaceId') workspaceId: string) {
    return this.salesforceService.generateAuthUrl(workspaceId);
  }

  @Get('salesforce/authorize/salesforce/callback')
  async salesforceCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    try {
      await this.salesforceService.salesforceCallback(code, state);
      res.redirect(this.oauthSuccessUri);
    } catch (error) {
      this.logger.error(
        'Salesforce OAuth callback failed:',
        error.stack || error,
      );
      res.redirect(this.oauthErrorUri);
    }
  }

  @Get('mailchimp/connect')
  @UseGuards(AuthGuard)
  generatemailchimpURL(@Query('workspaceId') workspaceId: string) {
    return this.mailchimpService.generateAuthUrl(workspaceId);
  }

  @Get('mailchimp/authorize/mailchimp/callback')
  async mailchimpCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    try {
      await this.mailchimpService.mailchimpCallback(code, state);
      res.redirect(this.oauthSuccessUri);
    } catch (error) {
      this.logger.error(
        'Mailchimp OAuth callback failed:',
        error.stack || error,
      );
      res.redirect(this.oauthErrorUri);
    }
  }

  @Get('hubspot/connect')
  @UseGuards(AuthGuard)
  generatehubspotURL(@Query('workspaceId') workspaceId: string) {
    return this.hubspotService.generateAuthUrl(workspaceId);
  }

  @Get('hubspot/authorize/hubspot/callback')
  async hubspotCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    try {
      await this.hubspotService.hubspotCallback(code, state);
      res.redirect(this.oauthSuccessUri);
    } catch (error) {
      this.logger.error('Hubspot OAuth callback failed:', error.stack || error);
      res.redirect(this.oauthErrorUri);
    }
  }

  @Get('zendesk/connect')
  @UseGuards(AuthGuard)
  generatezendeskURL(@Query('workspaceId') workspaceId: string) {
    return this.zendeskService.generateAuthUrl(workspaceId);
  }

  @Get('zendesk/authorize/zendesk/callback')
  async zendeskCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    try {
      await this.zendeskService.zendeskCallback(code, state);
      res.redirect(this.oauthSuccessUri);
    } catch (error) {
      this.logger.error('Hubspot OAuth callback failed:', error.stack || error);
      res.redirect(this.oauthErrorUri);
    }
  }
}
