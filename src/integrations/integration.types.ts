import { WorkspaceIntegration } from './entities/integration.entity';

export interface IState {
  workspaceId: string;
  integration: IntegrationType;
  shop?: string;
}

export interface IOAuthInfo {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenExpiresAt: number;
  fbUserId: string;
  stripeUserId: string;
  quickbooksRealmId: string;
  shopifyShop: string;
  salesforceInstanceUrl: string;
  salesforceUserId: string;
  gaPropertyId: string;
}

export type IntegrationType =
  | 'google_analytics'
  | 'hubspot'
  | 'quick_books'
  | 'facebook_ads'
  | 'google_ads'
  | 'salesforce'
  | 'stripe'
  | 'zendesk'
  | 'mailchimp';

export interface IDataSync {
  propertyId?: string;
  workspaceIntegration: WorkspaceIntegration;
}

export interface ICustomIntegration {
  name: string;
  description: string;
  workspaceId: string;
}
