import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IState } from '../integration.types';
import { IntegrationsService } from '../integrations.service';

@Injectable()
export class FacebookAdsService {
  private appId: string;
  private redirectURI: string;
  private appSecret: string;

  constructor(
    private readonly integrationService: IntegrationsService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.appId = this.configService.get<string>('FACEBOOK_APP_ID')!;
    this.appSecret = this.configService.get<string>('FACEBOOK_APP_SECRET')!;
    this.redirectURI = this.configService.get<string>('FACEBOOK_REDIRECT_URI')!;
  }

  generateAuthUrl(userId: string): string {
    const statePayload = {
      userId,
      integration: 'facebook_ads',
    };
    const state = Buffer.from(JSON.stringify(statePayload)).toString('base64');
    const fbAuthUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${this.appId}&redirect_uri=${this.redirectURI}&scope=ads_read,business_management&state=${state}`;
    return fbAuthUrl;
  }

  async facebookCallback(code: string, state: string) {
    try {
      const decoded = JSON.parse(
        Buffer.from(state, 'base64').toString('utf-8'),
      ) as IState;
      const { userId, integration } = decoded;
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
      const { access_token } = tokenRes.data;
      const userRes = await this.httpService.axiosRef.get(
        `https://graph.facebook.com/me`,
        {
          params: {
            access_token,
            fields: 'id,name,email',
          },
        },
      );

      await this.integrationService.saveOAuthIntegration(userId, integration, {
        fbUserId: userRes.data.id,
        accessToken: access_token,
      });
    } catch (error) {
      Logger.error(error);
      throw error;
    }
  }
}
