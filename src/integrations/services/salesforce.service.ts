import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getEncodedState } from '../integration.utils';
import { IntegrationsService } from '../integrations.service';

@Injectable()
export class SalesforceService {
  private readonly logger = new Logger(SalesforceService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor(
    private readonly integrationService: IntegrationsService,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.clientId = this.configService.get<string>('SALESFORCE_CONSUMER_KEY')!;
    this.clientSecret = this.configService.get<string>(
      'SALESFORCE_CONSUMER_SECRET',
    )!;
    this.redirectUri = this.configService.get<string>(
      'SALESFORCE_REDIRECT_URI',
    )!;
  }

  generateAuthUrl(workspaceId: string): string {
    const scope = 'api';
    const statePayload = {
      workspaceId,
      integration: 'salesforce',
    };
    const state = Buffer.from(JSON.stringify(statePayload)).toString('base64');
    const authUrl = `https://login.salesforce.com/services/oauth2/authorize?response_type=code&client_id=${this.clientId}&redirect_uri=${this.redirectUri}&scope=${scope}&state=${state}`;
    return authUrl;
  }

  async salesforceCallback(code: string, state: string) {
    try {
      const decoded = getEncodedState(state);
      const { workspaceId, integration } = decoded;
      const response = await this.httpService.axiosRef.post(
        'https://login.salesforce.com/services/oauth2/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: this.clientId,
          client_secret: this.clientSecret,
          redirect_uri: this.redirectUri,
          code,
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      );

      const {
        access_token,
        refresh_token,
        instance_url,
        id: userIdentityUrl,
      } = response.data;

      await this.integrationService.saveOAuthIntegration(
        workspaceId,
        integration,
        {
          accessToken: access_token,
          refreshToken: refresh_token,
          salesforceInstanceUrl: instance_url,
          salesforceUserId: userIdentityUrl,
        },
      );
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async refreshSalesforceAccessToken(refreshToken: string) {
    const response = await this.httpService.axiosRef.post(
      'https://login.salesforce.com/services/oauth2/token',
      new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );

    return response.data.access_token;
  }
}
