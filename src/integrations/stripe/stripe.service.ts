import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import Stripe from 'stripe';
import { IDataSync, IOAuthInfo } from '../integration.types';
import { IntegrationsService } from '../integrations.service';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly secretKey: Buffer;
  private readonly iv: Buffer;

  constructor(
    private readonly integrationService: IntegrationsService,
    private readonly configService: ConfigService,
  ) {
    const encryptionKey = this.configService.get<string>('ENCRYPTION_KEY')!;
    this.secretKey = crypto.scryptSync(encryptionKey, 'salt', 32);
    this.iv = crypto.randomBytes(16);
  }

  private encrypt(text: string): string {
    const cipher = crypto.createCipheriv(
      this.algorithm,
      this.secretKey,
      this.iv,
    );
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag();
    return `${this.iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
  }

  private decrypt(encryptedText: string): string {
    const [ivHex, tagHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');

    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.secretKey,
      iv,
    );
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  async saveRestrictedKey(workspaceId: string, apiKey: string) {
    const encryptedApiKey = this.encrypt(apiKey);
    await this.integrationService.saveOAuthIntegration(workspaceId, 'stripe', {
      stripeApiKey: encryptedApiKey,
    });
    this.logger.log(`Saved Stripe restricted key for workspace ${workspaceId}`);
  }

  private createStripeClient(apiKey: string) {
    return new Stripe(apiKey, {
      apiVersion: '2025-07-30.basil',
    });
  }

  async syncData({ workspaceIntegration }: IDataSync) {
    this.logger.log(
      `Fetching Stripe data for user ${workspaceIntegration.workspace.id}`,
    );
    const authData = workspaceIntegration.authData as IOAuthInfo;
    const apiKey = authData.stripeApiKey;
    if (!apiKey) {
      throw new InternalServerErrorException(
        'No Stripe API key found for this workspace',
      );
    }

    const decryptedApiKey = this.decrypt(apiKey);
    const stripe = this.createStripeClient(decryptedApiKey);

    const account = await stripe.accounts.retrieve();
    const charges = await stripe.charges.list({ limit: 10 });
    const payouts = await stripe.payouts.list({ limit: 10 });

    return { account, charges, payouts };
  }
}
