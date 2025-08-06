import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Mutex } from 'async-mutex';
import { GoogleAuth, OAuth2Client } from 'google-auth-library';
import { analyticsadmin_v1beta, google } from 'googleapis';
import { IOAuthInfo } from '../integration.types';
import { getEncodedState } from '../integration.utils';
import { IntegrationsService } from '../integrations.service';

@Injectable()
export class GoogleAnalyticsService {
  private readonly logger = new Logger(GoogleAnalyticsService.name);
  private oauthClient: OAuth2Client;
  private readonly refreshMutex = new Mutex();

  constructor(
    private readonly integrationService: IntegrationsService,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.oauthClient = new OAuth2Client({
      client_id: this.configService.get<string>('GOOGLE_CLIENT_ID'),
      client_secret: this.configService.get<string>('GOOGLE_CLIENT_SECRET'),
      redirectUri: this.configService.get<string>('GOOGLE_REDIRECT_URI'),
    });
  }

  private getAuthClientForUser(
    accessToken: string,
    refreshToken: string,
  ): OAuth2Client {
    const userOAuthClient = new OAuth2Client({
      clientId: this.configService.get<string>('GOOGLE_CLIENT_ID'),
      clientSecret: this.configService.get<string>('GOOGLE_CLIENT_SECRET'),
    });

    userOAuthClient.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    return userOAuthClient;
  }

  async getGoogleAnalyticsProperties(
    workspaceId: string,
    workspaceIntegrationId: string,
  ): Promise<
    analyticsadmin_v1beta.Schema$GoogleAnalyticsAdminV1betaProperty[]
  > {
    try {
      const integration =
        await this.integrationService.findWorkspaceIntegrationByWorkspaceId(
          workspaceId,
          workspaceIntegrationId,
        );

      const rawAuthData = integration.authData;
      if (!rawAuthData) {
        throw new BadRequestException('No valid authentication found');
      }

      const authData = rawAuthData as IOAuthInfo;

      const updatedAuthData = await this.refreshTokenIfNeeded(
        workspaceId,
        workspaceIntegrationId,
        authData,
      );

      if (!updatedAuthData.accessToken) {
        throw new BadRequestException(
          'No access token found for this integration',
        );
      }

      const authClient = this.getAuthClientForUser(
        updatedAuthData.accessToken,
        updatedAuthData.refreshToken,
      );

      const analyticsAdminClient = google.analyticsadmin({
        version: 'v1beta',
        auth: authClient,
      });

      // List all accounts for the authenticated user.
      const accountsResponse = await analyticsAdminClient.accounts.list({});
      const accounts = accountsResponse.data.accounts || [];

      if (accounts.length === 0) {
        return [];
      }

      const allProperties: analyticsadmin_v1beta.Schema$GoogleAnalyticsAdminV1betaProperty[] =
        [];

      // For each account, list its properties.
      for (const account of accounts) {
        if (account.name) {
          try {
            // Extract the account ID from the resource name (e.g., 'accounts/12345')
            const accountId = account.name.split('/')[1];

            const propertiesResponse =
              await analyticsAdminClient.properties.list({
                filter: `parent:accounts/${accountId}`,
              });
            const properties = propertiesResponse.data.properties || [];
            allProperties.push(...properties);
          } catch (listError) {
            this.logger.error(
              `Failed to list properties for account ${account.name}:`,
              listError,
            );
          }
        }
      }
      await this.integrationService.updateWorkspaceIntegration(
        workspaceIntegrationId,
        {
          lastSynced: new Date().toLocaleString(),
        },
      );
      return allProperties;
    } catch (error) {
      this.logger.error(
        'Error fetching GA properties:',
        error.response?.data || error.message,
      );
      if (error.code === 401) {
        throw new BadRequestException(
          'Authentication failed. Please re-authenticate with Google Analytics.',
        );
      }
      throw new InternalServerErrorException('Failed to fetch GA properties');
    }
  }

  async getGaData(
    propertyId: string,
    workspaceId: string,
    workspaceIntegrationId: string,
  ) {
    const integration =
      await this.integrationService.findWorkspaceIntegrationByWorkspaceId(
        workspaceId,
        workspaceIntegrationId,
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

    this.logger.log(
      `Fetching GA data for user ${workspaceId}, property ${propertyId}`,
    );

    const updatedAuthData = await this.refreshTokenIfNeeded(
      workspaceId,
      workspaceIntegrationId,
      authData,
    );

    return await this.getPageViewsAndUsers(
      updatedAuthData.accessToken,
      updatedAuthData.refreshToken,
      propertyId,
      '30daysAgo',
      'today',
    );
  }

  private getAnalyticsClientForUser(accessToken: string, refreshToken: string) {
    const oauth2Client = new OAuth2Client({
      clientId: this.configService.get<string>('GOOGLE_CLIENT_ID'),
      clientSecret: this.configService.get<string>('GOOGLE_CLIENT_SECRET'),
    });

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    const auth = new GoogleAuth({
      authClient: oauth2Client,
      scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
    });

    return new BetaAnalyticsDataClient({
      auth: auth,
    });
  }

  private async getPageViewsAndUsers(
    accessToken: string,
    refreshToken: string,
    propertyId: string,
    startDate: string,
    endDate: string,
  ) {
    try {
      const analyticsDataClient = this.getAnalyticsClientForUser(
        accessToken,
        refreshToken,
      );

      const [response] = await analyticsDataClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [
          {
            startDate: startDate,
            endDate: endDate,
          },
        ],
        dimensions: [
          { name: 'date' },
          { name: 'sessionSource' },
          { name: 'sessionMedium' },
        ],
        metrics: [
          { name: 'totalUsers' },
          { name: 'newUsers' },
          { name: 'sessions' },
          { name: 'averageSessionDuration' },
          { name: 'bounceRate' },
          { name: 'engagementRate' },
          { name: 'screenPageViews' },
          { name: 'eventCount' },
        ],
      });

      const reportData =
        response.rows?.map((row) => {
          const metricValues = row.metricValues || [];

          const totalUsers = parseFloat(metricValues[0]?.value || '0');
          const newUsers = parseFloat(metricValues[1]?.value || '0');
          const sessions = parseFloat(metricValues[2]?.value || '0');
          const averageSessionDuration = parseFloat(
            metricValues[3]?.value || '0',
          );
          const bounceRate = parseFloat(metricValues[4]?.value || '0');
          const engagementRate = parseFloat(metricValues[5]?.value || '0');
          const pageViews = parseFloat(metricValues[6]?.value || '0');
          const eventCount = parseFloat(metricValues[9]?.value || '0');

          return {
            date: row.dimensionValues?.[0]?.value,
            trafficSource: row.dimensionValues?.[1]?.value,
            trafficMedium: row.dimensionValues?.[2]?.value,

            // Metrics
            users: totalUsers,
            newUsers,
            sessions,
            averageSessionDuration,
            bounceRate,
            engagementRate,
            pageViews,
            pagesPerSession: sessions > 0 ? pageViews / sessions : 0, // Calculated metric
            eventCount,
          };
        }) ?? [];

      return reportData;
    } catch (error) {
      this.logger.error('Error fetching Google Analytics data:', error);

      if (
        error.code === 401 ||
        error.message?.includes('invalid_grant') ||
        error.message?.includes('invalid authentication')
      ) {
        throw new BadRequestException(
          'Authentication failed. Please re-authenticate with Google Analytics.',
        );
      }

      if (error.code === 403) {
        throw new BadRequestException(
          'Access denied. Please ensure you have access to this Google Analytics property.',
        );
      }

      throw new InternalServerErrorException(
        `Failed to sync GA data: ${error.message}`,
      );
    }
  }

  generateAuthUrl(workspaceId: string): string {
    const scopes = [
      'https://www.googleapis.com/auth/analytics.readonly',
      'https://www.googleapis.com/auth/analytics.manage.users.readonly',
    ];
    const statePayload = {
      workspaceId,
      integration: 'google_analytics',
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
      this.logger.log(
        `Attempting to exchange OAuth code for tokens for workspace ${workspaceId}`,
      );
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
        `Successfully saved GA OAuth integration for user ${workspaceId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error in googleAnalyticsCallback for workspace ${workspaceId}:`,
        error.stack || error,
      );
      throw new InternalServerErrorException(
        'Failed to process Google Analytics OAuth callback',
      );
    }
  }

  async refreshTokenIfNeeded(
    workspaceId: string,
    workspaceIntegrationId: string,
    authData: IOAuthInfo,
  ): Promise<IOAuthInfo> {
    const now = Date.now();
    const expirationTime = authData.tokenExpiresAt || 0;
    const buffer = 5 * 60 * 1000;

    if (expirationTime - now < buffer) {
      this.logger.warn(
        `Token for integration ${workspaceIntegrationId} is about to expire. Refreshing...`,
      );

      const release = await this.refreshMutex.acquire();
      try {
        const updatedIntegration =
          await this.integrationService.findWorkspaceIntegrationByWorkspaceId(
            workspaceId,
            workspaceIntegrationId,
          );

        const updatedAuthData = updatedIntegration.authData as IOAuthInfo;

        if (updatedAuthData.tokenExpiresAt - Date.now() > buffer) {
          this.logger.log('Token already refreshed by another process.');
          return updatedAuthData;
        }

        const oauth2Client = new OAuth2Client({
          clientId: this.configService.get<string>('GOOGLE_CLIENT_ID'),
          clientSecret: this.configService.get<string>('GOOGLE_CLIENT_SECRET'),
        });

        oauth2Client.setCredentials({
          access_token: authData.accessToken,
          refresh_token: authData.refreshToken,
        });

        const { credentials } = await oauth2Client.refreshAccessToken();

        authData.accessToken = credentials.access_token!;
        if (credentials.refresh_token) {
          authData.refreshToken = credentials.refresh_token;
        }
        authData.tokenExpiresAt = credentials.expiry_date || 0;

        await this.integrationService.updateOAuthTokens(
          workspaceIntegrationId,
          authData,
        );

        this.logger.log('Successfully refreshed access token');
        return updatedAuthData;
      } catch (error) {
        this.logger.error('Error refreshing access token:', error);
        throw new BadRequestException(
          'Failed to refresh access token. Please re-authenticate.',
        );
      } finally {
        release();
      }
    }
    // If the token doesn't need to be refreshed, just return the original data
    return authData;
  }
}
