import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IDataSync, IOAuthInfo } from '../integration.types';
import { getEncodedState } from '../integration.utils';
import { IntegrationsService } from '../integrations.service';

@Injectable()
export class FacebookAdsService {
  private readonly logger = new Logger(FacebookAdsService.name);
  private appId: string;
  private redirectURI: string;
  private appSecret: string;
  private insightsFields: string[];

  constructor(
    private readonly integrationService: IntegrationsService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.appId = this.configService.get<string>('FACEBOOK_APP_ID')!;
    this.appSecret = this.configService.get<string>('FACEBOOK_APP_SECRET')!;
    this.redirectURI = this.configService.get<string>('FACEBOOK_REDIRECT_URI')!;
    this.insightsFields = [
      'impressions',
      'reach',
      'clicks',
      'spend',
      'cpc',
      'cpm',
      'ctr',
      'frequency',
      'actions', // For conversions, engagement, leads
      'action_values', // For ROAS
    ];
  }

  generateAuthUrl(workspaceId: string): string {
    const statePayload = {
      workspaceId,
      integration: 'facebook_ads',
    };
    const state = Buffer.from(JSON.stringify(statePayload)).toString('base64');
    const fbAuthUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${this.appId}&redirect_uri=${this.redirectURI}&scope=ads_read,business_management&state=${state}`;
    return fbAuthUrl;
  }

  async facebookCallback(code: string, state: string) {
    const decoded = getEncodedState(state);
    const { workspaceId, integration } = decoded;
    try {
      const tokenRes = await this.httpService.axiosRef.get(
        'https://graph.facebook.com/v19.0/oauth/access_token',
        {
          params: {
            client_id: this.appId,
            client_secret: this.appSecret,
            redirect_uri: this.redirectURI,
            code,
          },
        },
      );
      const { access_token: shortLivedToken } = tokenRes.data;
      const longLivedToken =
        await this.getLongLivedAccessToken(shortLivedToken);
      const userRes = await this.httpService.axiosRef.get(
        `https://graph.facebook.com/me`,
        {
          params: {
            access_token: shortLivedToken,
            fields: 'id,name,email',
          },
        },
      );

      await this.integrationService.saveOAuthIntegration(
        workspaceId,
        integration,
        {
          fbUserId: userRes.data.id,
          accessToken: longLivedToken,
        },
      );
    } catch (error) {
      this.logger.error(
        `Error in FB Callback for workspace ${workspaceId}:`,
        error.stack || error,
      );
      throw new InternalServerErrorException(
        'Failed to process Facebook OAuth callback',
      );
    }
  }

  async getLongLivedAccessToken(shortLivedToken: string): Promise<string> {
    try {
      const response = await this.httpService.axiosRef.get(
        'https://graph.facebook.com/v19.0/oauth/access_token',
        {
          params: {
            grant_type: 'fb_exchange_token',
            client_id: this.appId,
            client_secret: this.appSecret,
            fb_exchange_token: shortLivedToken,
          },
        },
      );
      return response.data.access_token;
    } catch (error) {
      this.logger.error('Failed to get a long-lived access token', error);
      throw new InternalServerErrorException('Failed to get long-lived token');
    }
  }

  private async getAdAccountIds(accessToken: string): Promise<string[]> {
    try {
      const response = await this.httpService.axiosRef.get(
        'https://graph.facebook.com/v19.0/me/adaccounts',
        {
          params: {
            access_token: accessToken,
          },
        },
      );
      return response.data.data.map((account) => account.id);
    } catch (error) {
      this.logger.error('Failed to get Facebook Ad Accounts', error);
      throw new InternalServerErrorException('Failed to get Ad Accounts');
    }
  }

  async syncData({ workspaceIntegration }: IDataSync) {
    try {
      this.logger.log(
        `Fetching FB Ads data for workspace ${workspaceIntegration.workspace.id}}`,
      );

      const authData = workspaceIntegration.authData as IOAuthInfo;
      const adAccountIds = await this.getAdAccountIds(authData.accessToken);
      if (adAccountIds.length === 0) {
        return { message: 'No ad accounts found for this user.' };
      }

      const insightsPromises = adAccountIds.map((adAccountId) =>
        this.httpService.axiosRef.get(
          `https://graph.facebook.com/v19.0/${adAccountId}/insights`,
          {
            params: {
              access_token: authData.accessToken,
              fields: this.insightsFields.join(','),
              time_range: JSON.stringify({
                since: '2024-01-01',
                until: '2025-08-06',
              }),
              level: 'account', // Aggregates data at the account level
            },
          },
        ),
      );

      const insightsResponses = await Promise.all(insightsPromises);
      const aggregatedMetrics = this.processInsightsData(insightsResponses);
      await Promise.all(
        aggregatedMetrics.map((entry) =>
          this.integrationService.saveRawIntegrationData(
            workspaceIntegration.workspace.id,
            workspaceIntegration.id,
            entry,
            workspaceIntegration.integration.key,
          ),
        ),
      );

      await this.integrationService.updateWorkspaceIntegration(
        workspaceIntegration.id,
        {
          lastSynced: new Date().toLocaleString(),
        },
      );
      return aggregatedMetrics;
    } catch (error) {
      this.logger.error('Failed to get ad account metrics:', error);
      throw new InternalServerErrorException('Failed to get Facebook Ads data');
    }
  }

  private processInsightsData(responses: any[]): any {
    const totalMetrics = {
      impressions: 0,
      reach: 0,
      clicks: 0,
      spend: 0,
      video_views: 0,
      conversions: 0,
      leads: 0,
      website_conversions_value: 0,
      post_engagement: 0,
    };

    for (const response of responses) {
      const data = response.data?.data?.[0]; // Insights are in the first element of the data array
      if (!data) continue;

      totalMetrics.impressions += parseFloat(data.impressions || 0);
      totalMetrics.reach += parseFloat(data.reach || 0);
      totalMetrics.clicks += parseFloat(data.clicks || 0);
      totalMetrics.spend += parseFloat(data.spend || 0);
      totalMetrics.video_views += parseFloat(data.video_views || 0);

      // The `actions` array contains different types of actions
      if (data.actions) {
        for (const action of data.actions) {
          if (action.action_type === 'offsite_conversion.fb_pixel_purchase') {
            totalMetrics.conversions += parseFloat(action.value || 0);
          }
          if (action.action_type === 'leadgen.lead') {
            totalMetrics.leads += parseFloat(action.value || 0);
          }
          if (action.action_type === 'post_engagement') {
            totalMetrics.post_engagement += parseFloat(action.value || 0);
          }
        }
      }

      // The `action_values` array contains values for actions
      if (data.action_values) {
        for (const actionValue of data.action_values) {
          if (
            actionValue.action_type === 'offsite_conversion.fb_pixel_purchase'
          ) {
            totalMetrics.website_conversions_value += parseFloat(
              actionValue.value || 0,
            );
          }
        }
      }
    }

    const calculatedMetrics = {
      impressions: totalMetrics.impressions,
      reach: totalMetrics.reach,
      clicks: totalMetrics.clicks,
      adSpend: totalMetrics.spend,
      videoViews: totalMetrics.video_views,
      frequency: totalMetrics.impressions / totalMetrics.reach,
      ctr: (totalMetrics.clicks / totalMetrics.impressions) * 100,
      cpc: totalMetrics.spend / totalMetrics.clicks,
      cpm: (totalMetrics.spend / totalMetrics.impressions) * 1000,
      conversions: totalMetrics.conversions,
      costPerConversion:
        totalMetrics.conversions > 0
          ? totalMetrics.spend / totalMetrics.conversions
          : 0,
      roas:
        totalMetrics.website_conversions_value > 0
          ? totalMetrics.website_conversions_value / totalMetrics.spend
          : 0,
      engagementRate:
        (totalMetrics.post_engagement / totalMetrics.impressions) * 100,
      leadGenerationRate: (totalMetrics.leads / totalMetrics.clicks) * 100,
    };

    return calculatedMetrics;
  }
}
