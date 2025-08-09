import {
  BadRequestException,
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
      prompt: 'consent',
      state,
    });
  }

  async googleCallback(code: string, state: string) {
    const decoded = getEncodedState(state);
    const { workspaceId, integration } = decoded;

    try {
      const { tokens } = await this.oauthClient.getToken(code);

      this.logger.log(`Successfully received tokens. Saving to database...`);
      const { access_token, refresh_token, expiry_date } = tokens;

      if (!access_token || !refresh_token) {
        throw new BadRequestException('Did not receive all required tokens.');
      }

      await this.integrationService.saveOAuthIntegration(
        workspaceId,
        integration,
        {
          accessToken: access_token,
          refreshToken: refresh_token,
          expiresIn: expiry_date!,
          tokenExpiresAt: Date.now() + expiry_date! * 1000,
        },
      );

      this.logger.log(
        `Successfully saved GAds OAuth integration for workspace ${workspaceId}`,
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

  async syncData() {
    return { message: 'Not implemented' };
  }
}
