export interface IState {
  userId: string;
  integration: IntegrationType;
}

export type IntegrationType =
  | 'google_analytics'
  | 'hubspot'
  | 'quickbooks'
  | 'facebook_ads'
  | 'google_ads'
  | 'salesforce'
  | 'stripe'
  | 'zendesk'
  | 'mailchimp';
