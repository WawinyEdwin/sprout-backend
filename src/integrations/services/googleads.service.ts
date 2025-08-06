import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import { getEncodedState } from '../integration.utils';
import { IntegrationsService } from '../integrations.service';
// import { GoogleAdsApi } from 'google-ads-api';

@Injectable()
export class GoogleAdsService {
  private readonly logger = new Logger(GoogleAdsService.name);
  private oauthClient: OAuth2Client;
  // private adsClient: GoogleAdsApi

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
    try {
      const decoded = getEncodedState(state);
      const { workspaceId, integration } = decoded;
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

      await this.integrationService.saveOAuthIntegration(
        workspaceId,
        integration,
        {
          accessToken: access_token,
          refreshToken: refresh_token,
          expiresIn: expires_in,
        },
      );
    } catch (error) {
      this.logger.error(error);
    }
  }
}
