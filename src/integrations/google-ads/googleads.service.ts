import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import { getEncodedState } from '../integration.utils';
import { IntegrationsService } from '../integrations.service';

@Injectable()
export class GoogleAdsService {
  private readonly logger = new Logger(GoogleAdsService.name);
  private oauthClient: OAuth2Client;

  constructor(
    private readonly integrationService: IntegrationsService,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.oauthClient = new google.auth.OAuth2(
      this.configService.get<string>('GOOGLE_CLIENT_ID'),
      this.configService.get<string>('GOOGLE_CLIENT_SECRET'),
      this.configService.get<string>('GOOGLE_REDIRECT_URI'),
    );
  }

  generateAuthUrl(workspaceId: string): string {
    const scopes = ['https://www.googleapis.com/auth/adwords'];
    const statePayload = {
      workspaceId,
      integration: 'google_ads',
    };
    const state = Buffer.from(JSON.stringify(statePayload)).toString('base64');

    return this.oauthClient.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent', // ensures refresh_token is always returned
      state,
    });
  }

  async googleCallback(code: string, state: string) {
    const decoded = getEncodedState(state);
    const { workspaceId, integration } = decoded;
    try {
      const response = await this.httpService.axiosRef.post(
        'https://oauth2.googleapis.com/token',
        {
          code,
          client_id: this.configService.get<string>('GOOGLE_CLIENT_ID'),
          client_secret: this.configService.get<string>('GOOGLE_CLIENT_SECRET'),
          redirect_uri: this.configService.get<string>('GOOGLE_REDIRECT_URI'),
          grant_type: 'authorization_code',
        },
      );
      this.logger.log(`Successfully received tokens. Saving to database...`);
      const { access_token, refresh_token, expires_in } = response.data;

      await this.integrationService.saveOAuthIntegration(
        workspaceId,
        integration,
        {
          accessToken: access_token,
          refreshToken: refresh_token,
          expiresIn: expires_in,
          tokenExpiresAt: Date.now() + expires_in * 1000,
        },
      );

      this.logger.log(
        `Successfully saved GAds OAuth integration for user ${workspaceId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error in googleAdsCallback for workspace ${workspaceId}:`,
        error.stack || error,
      );
      throw new InternalServerErrorException(
        'Failed to process Google Ads OAuth callback',
      );
    }
  }

  // async getAccessibleCustomers(
  //   workspaceId: string,
  //   workspaceIntegrationId: string,
  // ): Promise<any[]> {
  //   try {
  //     const integration =
  //       await this.integrationService.findWorkspaceIntegrationByWorkspaceId(
  //         workspaceId,
  //         workspaceIntegrationId,
  //       );

  //     const rawAuthData = integration.authData;
  //     if (!rawAuthData) {
  //       throw new BadRequestException(
  //         'Missing auth information for this integration',
  //       );
  //     }

  //     const authData = rawAuthData as IOAuthInfo;

  //     if (!authData.accessToken) {
  //       throw new BadRequestException(
  //         'No access token found for this integration',
  //       );
  //     }

  //     let accessToken = authData.accessToken;
  //     let refreshToken = authData.refreshToken;

  //     // 2. Check if token is expired and refresh if necessary
  //     if (Date.now() > authData.tokenExpiresAt) {
  //       this.logger.log('Google Ads token expired. Refreshing...');
  //       const newTokens = await this.refreshAccessToken(refreshToken);
  //       accessToken = newTokens.accessToken;

  //       // Update the token in your database
  //       await this.integrationService.updateOAuthIntegration(
  //         workspaceIntegrationId,
  //         {
  //           accessToken: newTokens.accessToken,
  //           tokenExpiresAt: Date.now() + newTokens.expiresIn * 1000,
  //         },
  //       );
  //     }

  //     // The login_customer_id is required for most API calls.
  //     // This is the ID of the manager account (MCC) that the user is logged into.
  //     // If they don't have an MCC, it's just their single ad account ID.
  //     const loginCustomerId = 'YOUR_GOOGLE_ADS_LOGIN_CUSTOMER_ID';

  //     // 3. Initialize the Google Ads client
  //     const client = new GoogleAdsClient({
  //       client_id: this.clientId,
  //       client_secret: this.clientSecret,
  //       developer_token: this.configService.get<string>(
  //         'GOOGLE_DEVELOPER_TOKEN',
  //       )!,
  //       access_token: accessToken,
  //       refresh_token: refreshToken,
  //     });

  //     const customer = client.Customer({
  //       customer_id: loginCustomerId, // Use the login customer ID here
  //       login_customer_id: loginCustomerId,
  //     });

  //     const query = `
  //       SELECT
  //         customer_client.descriptive_name,
  //         customer_client.id
  //       FROM customer_client
  //     `;

  //     // 5. Execute the query and process the results
  //     const response = await customer.query(query);

  //     const customers = response.map((row) => ({
  //       id: row.customer_client.id,
  //       name: row.customer_client.descriptive_name,
  //     }));

  //     return customers;
  //   } catch (error) {
  //     this.logger.error(
  //       'Failed to get accessible Google Ads customers:',
  //       error.stack || error,
  //     );
  //     throw new InternalServerErrorException(
  //       'Failed to get Google Ads customer list',
  //     );
  //   }
  // }

  // async getGoogleAdsMetrics(
  //   workspaceIntegrationId: string,
  //   customerId: string,
  // ): Promise<any> {
  //   try {
  //     const integration = await this.integrationService.getOAuthIntegration(
  //       workspaceIntegrationId,
  //     );

  //     let accessToken = integration.accessToken;
  //     if (Date.now() > integration.tokenExpiresAt) {
  //       this.logger.log('Google Ads token expired. Refreshing...');
  //       const newTokens = await this.refreshAccessToken(
  //         integration.refreshToken,
  //       );
  //       accessToken = newTokens.accessToken;

  //       // Update the token in your database
  //       await this.integrationService.updateOAuthIntegration(
  //         workspaceIntegrationId,
  //         {
  //           accessToken: newTokens.accessToken,
  //           tokenExpiresAt: Date.now() + newTokens.expiresIn * 1000,
  //         },
  //       );
  //     }

  //     // Initialize the Google Ads client with your access token
  //     const client = new GoogleAdsClient({
  //       client_id: this.clientId,
  //       client_secret: this.clientSecret,
  //       developer_token: this.configService.get<string>(
  //         'GOOGLE_DEVELOPER_TOKEN',
  //       )!, // You must get this from Google
  //       access_token: accessToken,
  //       refresh_token: integration.refreshToken,
  //     });

  //     const customer = client.Customer({
  //       customer_id: customerId,
  //       login_customer_id: 'YOUR_LOGIN_CUSTOMER_ID_IF_MCCC', // Often the same as customerId for non-MCC accounts
  //     });

  //     // Construct the Google Ads Query Language (GAQL) query
  //     // This query gets metrics for a specific date range
  //     const query = `
  //       SELECT
  //         segments.date,
  //         metrics.clicks,
  //         metrics.impressions,
  //         metrics.cost_micros,
  //         metrics.ctr,
  //         metrics.conversions
  //       FROM ad_group
  //       WHERE
  //         segments.date >= '2024-01-01'
  //         AND segments.date <= '2024-08-06'
  //       ORDER BY segments.date DESC
  //     `;

  //     // Execute the query
  //     const results = await customer.query(query);

  //     // Process and aggregate the results
  //     const totalMetrics = {
  //       clicks: 0,
  //       impressions: 0,
  //       cost_micros: 0,
  //       conversions: 0,
  //     };

  //     for (const result of results) {
  //       totalMetrics.clicks += parseFloat(result.metrics.clicks || 0);
  //       totalMetrics.impressions += parseFloat(result.metrics.impressions || 0);
  //       totalMetrics.cost_micros += parseFloat(result.metrics.cost_micros || 0);
  //       totalMetrics.conversions += parseFloat(result.metrics.conversions || 0);
  //     }

  //     // Calculate the final metrics
  //     const finalMetrics = {
  //       clicks: totalMetrics.clicks,
  //       impressions: totalMetrics.impressions,
  //       adSpend: totalMetrics.cost_micros / 1000000, // Cost is in millionths
  //       conversions: totalMetrics.conversions,
  //       ctr: (totalMetrics.clicks / totalMetrics.impressions) * 100, // CTR is a percentage
  //       cpc: totalMetrics.cost_micros / totalMetrics.clicks / 1000000, // CPC is cost / clicks
  //     };

  //     return finalMetrics;
  //   } catch (error) {
  //     this.logger.error(
  //       'Failed to get Google Ads metrics:',
  //       error.stack || error,
  //     );
  //     throw new InternalServerErrorException('Failed to get Google Ads data');
  //   }
  // }
}
