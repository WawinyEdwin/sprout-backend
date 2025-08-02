export enum AuthTypeEnum {
  OAUTH = 'OAuth',
  API_KEY = 'API Key',
}

export enum IntegrationCategoryEnum {
  BILLING = 'Billing',
  ADVERTISING = 'Advertising',
  CRM = 'CRM',
  FINANCE = 'Finance',
  DATABASE = 'Database',
  ECOMMERCE = 'E-commerce',
  ANALYTICS = 'Analytics',
  MARKETING = 'Marketing',
  CUSTOMER_SERVICE = 'Customer Service',
}

export enum DataSyncFrequencyEnum {
  REAL_TIME = 'realtime',
  EVERY_HOUR = 'every_hour',
  EVERY_15_MINS = 'every_fifteen_mins',
  DAILY = 'Daily',
}

export enum HistoricalDataEnum {
  LAST_30_DAYS = 'last_thirty_days',
  LAST_90_DAYS = 'last_ninety_days',
  LAST_YEAR = 'last_year',
  ALL_AVAILABLE_DATA = 'all_available_data',
}
