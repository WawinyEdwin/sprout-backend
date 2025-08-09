import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { getEncodedState } from '../integration.utils';
import { IntegrationsService } from '../integrations.service';

@Injectable()
export class ShopifyService {
  private readonly logger = new Logger(ShopifyService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor(
    private readonly integrationService: IntegrationsService,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.clientId = this.configService.get<string>('SHOPIFY_CLIENT_ID')!;
    this.clientSecret = this.configService.get<string>(
      'SHOPIFY_CLIENT_SECRET',
    )!;
    this.redirectUri = this.configService.get<string>('SHOPIFY_REDIRECT_URI')!;
  }

  generateAuthUrl(workspaceId: string, shop: string): string {
    const statePayload = {
      workspaceId,
      integration: 'shopify',
      shop,
    };
    const state = Buffer.from(JSON.stringify(statePayload)).toString('base64');
    const scopes = 'read_orders,read_customers,read_products';
    const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${this.clientId}&scope=${scopes}&redirect_uri=${this.redirectUri}&state=${state}`;
    return authUrl;
  }

  async shopifyCallback(code: string, state: string) {
    const decoded = getEncodedState(state);
    const { workspaceId, integration, shop } = decoded;
    // const valid = this.verifyShopifyHMAC(query, SHOPIFY_SECRET_KEY);
    const tokenResponse = await this.httpService.axiosRef.post(
      `https://${shop}/admin/oauth/access_token`,
      {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
      },
      { headers: { 'Content-Type': 'application/json' } },
    );

    const { access_token } = tokenResponse.data;

    await this.integrationService.saveOAuthIntegration(
      workspaceId,
      integration,
      {
        accessToken: access_token,
        shopifyShop: shop,
      },
    );
  }

  private verifyShopifyHMAC(query: Record<string, string>, secret: string) {
    const { hmac, ...rest } = query;

    const sorted = Object.keys(rest)
      .sort()
      .map((key) => `${key}=${rest[key]}`)
      .join('&');

    const generatedHmac = crypto
      .createHmac('sha256', secret)
      .update(sorted)
      .digest('hex');

    return generatedHmac === hmac;
  }

  async syncData() {}
}
