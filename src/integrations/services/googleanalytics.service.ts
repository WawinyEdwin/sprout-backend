import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import { IState } from '../integration.types';
import { IntegrationsService } from '../integrations.service';

@Injectable()
export class GoogleAnalyticsService {
  private analyticsDataClient: BetaAnalyticsDataClient;
  private oauthClient: OAuth2Client;

  constructor(
    private readonly integrationService: IntegrationsService,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.analyticsDataClient = new BetaAnalyticsDataClient({});
    this.oauthClient = new google.auth.OAuth2(
      this.configService.get<string>('GOOGLE_CLIENT_ID'),
      this.configService.get<string>('GOOGLE_CLIENT_SECRET'),
      this.configService.get<string>('GOOGLE_REDIRECT_URI'),
    );
  }

  generateAuthUrl(userId: string): string {
    const scopes = ['https://www.googleapis.com/auth/analytics.readonly'];
    const statePayload = {
      userId,
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
    const decoded = JSON.parse(
      Buffer.from(state, 'base64').toString('utf-8'),
    ) as IState;
    try {
      const { userId, integration } = decoded;
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
      const { access_token, refresh_token, expires_in } = response.data;

      await this.integrationService.saveOAuthIntegration(userId, integration, {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresIn: expires_in,
      });
    } catch (error) {
      Logger.error(error);
    }
  }

  async syncData(userId: string, userIntegrationId: string): Promise<void> {
    try {
      const integrationData =
        await this.integrationService.getIntegrationAuthDataByUserId(
          userId,
          userIntegrationId,
        );

      const [response] = await this.analyticsDataClient.runReport({
        property: `properties/${integrationData?.authData?.propertyId}`,
        dateRanges: [
          {
            startDate: '2020-03-31',
            endDate: 'today',
          },
        ],
        dimensions: [
          {
            name: 'city',
          },
        ],
        metrics: [
          {
            name: 'activeUsers',
          },
        ],
      });

      console.log('Report result:', response);
    } catch (error) {
      Logger.error(error);
      throw new InternalServerErrorException('Failed to sync GA data');
    }
  }
}
