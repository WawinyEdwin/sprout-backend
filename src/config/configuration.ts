import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').required(),
  EMAIL_REDIRECT: Joi.string().uri().default('http://localhost:3000/auth/signin?redirect=/dashboard/onboarding'),
  PORT: Joi.number().default(9000),
  DB_HOST: Joi.string().hostname().required(),
  DB_PORT: Joi.number().port().default(5432),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_NAME: Joi.string().required(),
  SUPABASE_JWT_SECRET: Joi.string().required(),
  SUPABASE_URL: Joi.string().uri().required(),
  SUPABASE_ANON_KEY: Joi.string().required(),
  FRONTEND_URL: Joi.string().uri().required(),
  GOOGLE_CLIENT_ID: Joi.string().required(),
  GOOGLE_CLIENT_SECRET: Joi.string().required(),
  GOOGLE_REDIRECT_URI: Joi.string().uri().required(),
  FACEBOOK_APP_ID: Joi.string().required(),
  FACEBOOK_APP_SECRET: Joi.string().required(),
  FACEBOOK_REDIRECT_URI: Joi.string().uri().required(),
  STRIPE_API_KEY: Joi.string().required(),
  STRIPE_REDIRECT_URI: Joi.string().uri().required(),
  STRIPE_CLIENT_ID: Joi.string().required(),
  QUICKBOOKS_CLIENT_ID: Joi.string().required(),
  QUICKBOOKS_CLIENT_SECRET: Joi.string().required(),
  QUICKBOOKS_REDIRECT_URI: Joi.string().uri().required(),
  SHOPIFY_CLIENT_ID: Joi.string().required(),
  SHOPIFY_CLIENT_SECRET: Joi.string().required(),
  SHOPIFY_REDIRECT_URI: Joi.string().uri().required(),
  SALESFORCE_CONSUMER_KEY: Joi.string().required(),
  SALESFORCE_CONSUMER_SECRET: Joi.string().required(),
  SALESFORCE_REDIRECT_URI: Joi.string().uri().required(),
});

export default () => ({
  port: parseInt(process.env.PORT ?? '9000', 10),
  database: {
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    name: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
  },
  supabase: {
    jwtSecret: process.env.SUPABASE_JWT_SECRET,
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
  },
  frontend: {
    url: process.env.FRONTEND_URL,
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectURI: process.env.GOOGLE_CLIENT_REDIRECT_URI,
  },
  facebook: {
    appId: process.env.FACEBOOK_APP_ID,
    appSecret: process.env.FACEBOOK_APP_SECRET,
    redirectURI: process.env.FACEBOOK_REDIRECT_URI,
  },
  stripe: {
    apiKey: process.env.STRIPE_API_KEY,
    clientId: process.env.STRIPE_CLIENT_ID,
    redirectURI: process.env.STRIPE_REDIRECT_URI,
  },
  // zendesk: {},
  // hubspot: {}.
  // mailchimp: {}
  shopify: {
    clientId: process.env.SHOPIFY_CLIENT_ID,
    clientSecret: process.env.SHOPIFY_CLIENT_SECRET,
    redirectURI: process.env.SHOPIFY_CLIENT_REDIRECT_URI,
  },
  salesforce: {
    consumnerKey: process.env.SALESFORCE_CONSUMER_ID,
    consumerSecret: process.env.SALESFORCE_CONSUMER_SECRET,
    redirectURI: process.env.SHOPIFY_CLIENT_REDIRECT_URI,
  },
  quickbooks: {
    clientId: process.env.QUICKBOOKS_CLIENT_ID,
    clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET,
    redirectURI: process.env.QUICKBOOKS_CLIENT_REDIRECT_URI,
  },
});
