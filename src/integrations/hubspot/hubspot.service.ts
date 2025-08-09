import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getEncodedState } from '../integration.utils';
import { IntegrationsService } from '../integrations.service';

@Injectable()
export class HubspotService {
  private readonly logger = new Logger(HubspotService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly integrationService: IntegrationsService,
    private readonly httpService: HttpService,
  ) {
    this.clientId = this.configService.get<string>('HUBSPOT_CLIENT_ID')!;
    this.clientSecret = this.configService.get<string>(
      'HUBSPOT_CLIENT_SECRET',
    )!;
    this.redirectUri = this.configService.get<string>('HUBSPOT_REDIRECT_URI')!;
  }

  async generateAuthUrl(workspaceId: string) {
    const statePayload = {
      workspaceId,
      integration: 'hubspot',
    };
    const state = Buffer.from(JSON.stringify(statePayload)).toString('base64');
    const url = `https://app.hubspot.com/oauth/authorize?response_type=code&client_id=${this.clientId}&redirect_uri=${this.redirectUri}?state${state}`;
    return url;
  }

  async hubspotCallback(code: string, state: string) {
    const decoded = getEncodedState(state);
    const { workspaceId, integration } = decoded;
    try {
      const tokenRes = await this.httpService.axiosRef.post(
        'https://api.hubapi.com/oauth/v1/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: this.clientId,
          client_secret: this.clientSecret,
          redirect_uri: this.redirectUri,
          code,
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      );

      const { access_token, refresh_token, expires_in } = tokenRes.data;

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
        `Successfully saved hubspot OAuth integration for user ${workspaceId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error in hubspot callback for workspace ${workspaceId}:`,
        error.stack || error,
      );
      throw new InternalServerErrorException(
        'Failed to process maichimp OAuth callback',
      );
    }
  }

  async syncData() {
    return { message: 'Not implemented' };
  }
}
