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
export class MailchimpService {
  private readonly logger = new Logger(MailchimpService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly integrationService: IntegrationsService,
    private readonly httpService: HttpService,
  ) {
    this.clientId = this.configService.get<string>('MAILCHIMP_CLIENT_ID')!;
    this.clientSecret = this.configService.get<string>(
      'MAILCHIMP_CLIENT_SECRET',
    )!;
    this.redirectUri = this.configService.get<string>(
      'MAILCHIMP_REDIRECT_URI',
    )!;
  }

  async generateAuthUrl(workspaceId: string) {
    const statePayload = {
      workspaceId,
      integration: 'mailchimp',
    };
    const state = Buffer.from(JSON.stringify(statePayload)).toString('base64');
    const url = `https://login.mailchimp.com/oauth2/authorize?response_type=code&client_id=${this.clientId}&redirect_uri=${this.redirectUri}?state${state}`;
    return url;
  }

  async mailchimpCallback(code: string, state: string) {
    const decoded = getEncodedState(state);
    const { workspaceId, integration } = decoded;
    try {
      const tokenRes = await this.httpService.axiosRef.post(
        'https://login.mailchimp.com/oauth2/token',
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

      //   const metadataRes = await this.httpService.axiosRef.get(
      //     'https://login.mailchimp.com/oauth2/metadata',
      //     {
      //       headers: {
      //         Authorization: `OAuth ${access_token}`,
      //       },
      //     },
      //   );

      //   const { api_endpoint } = metadataRes.data;

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
        `Successfully saved mailchimp OAuth integration for user ${workspaceId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error in mailchimp callaback for workspace ${workspaceId}:`,
        error.stack || error,
      );
      throw new InternalServerErrorException(
        'Failed to process maichimp OAuth callback',
      );
    }
  }
}
