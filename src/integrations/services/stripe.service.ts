import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { getEncodedState } from '../integration.utils';
import { IntegrationsService } from '../integrations.service';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly stripe: Stripe;
  private readonly clientId: string;
  private readonly redirectUri: string;
  private readonly apiKey: string;

  constructor(
    private readonly integrationService: IntegrationsService,
    private readonly configService: ConfigService,
  ) {
    this.clientId = this.configService.get<string>('STRIPE_CLIENT_ID')!;
    this.redirectUri = this.configService.get<string>('STRIPE_REDIRECT_URI')!;
    this.apiKey = this.configService.get<string>('STRIPE_API_KEY')!;
    this.stripe = new Stripe(this.apiKey, {
      apiVersion: '2025-07-30.basil',
    });
  }

  generateAuthUrl(workspaceId: string): string {
    const statePayload = {
      workspaceId,
      integration: 'stripe',
    };
    const state = Buffer.from(JSON.stringify(statePayload)).toString('base64');
    const stripeAuthUrl = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${this.clientId}&scope=read&redirect_uri=${this.redirectUri}&state=${state}`;
    return stripeAuthUrl;
  }

  async stripeCallback(code: string, state: string) {
    try {
      const decoded = getEncodedState(state);
      const { workspaceId, integration } = decoded;
      const tokenResponse = await this.stripe.oauth.token({
        grant_type: 'authorization_code',
        code,
      });
      const { access_token, stripe_user_id } = tokenResponse;

      await this.integrationService.saveOAuthIntegration(
        workspaceId,
        integration,
        {
          stripeUserId: stripe_user_id,
          accessToken: access_token,
        },
      );
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
