import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Mutex } from 'async-mutex';
import { IDataSync, IOAuthInfo } from '../integration.types';
import { getEncodedState } from '../integration.utils';
import { IntegrationsService } from '../integrations.service';
import {
  calculateNetProfitMargin,
  extractBalanceByBankAccounts,
  findMetricValue,
} from './quickbooks.utils';

@Injectable()
export class QuickbookService {
  private readonly logger = new Logger(QuickbookService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly refreshMutex = new Mutex();

  constructor(
    private readonly integrationService: IntegrationsService,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.clientId = this.configService.get<string>('QUICKBOOKS_CLIENT_ID')!;
    this.clientSecret = this.configService.get<string>(
      'QUICKBOOKS_CLIENT_SECRET',
    )!;
    this.redirectUri = this.configService.get<string>(
      'QUICKBOOKS_REDIRECT_URI',
    )!;
  }

  async syncData({ workspaceIntegration }: IDataSync) {
    try {
      this.logger.log(
        `Fetching Quickbooks  data for user ${workspaceIntegration.workspace.id}`,
      );

      const authData = workspaceIntegration.authData as IOAuthInfo;
      const updatedAuthData = await this.refreshTokenIfNeeded(
        workspaceIntegration.workspace.id,
        workspaceIntegration.id,
        authData,
      );

      if (!updatedAuthData.accessToken || !updatedAuthData.quickbooksRealmId) {
        throw new BadRequestException(
          'QuickBooks auth data is incomplete. Please re-authenticate.',
        );
      }

      const realmId = updatedAuthData.quickbooksRealmId;
      const accessToken = updatedAuthData.accessToken;
      const headers = {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      };

      const baseUrl = `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}`;
      const [
        cashFlowReport,
        profitLossReport,
        salesByProductReport,
        balanceSheet,
      ] = await Promise.all([
        this.httpService.axiosRef.get(
          `${baseUrl}/reports/CashFlow?minorversion=75`,
          {
            headers,
          },
        ),

        this.httpService.axiosRef.get(
          `${baseUrl}/reports/ProfitAndLoss?minorversion=75`,
          {
            headers,
          },
        ),

        this.httpService.axiosRef.get(
          `${baseUrl}/reports/ItemSales?minorversion=75`,
          { headers },
        ),

        this.httpService.axiosRef.get(
          `${baseUrl}/reports/BalanceSheet?date_macro=Last Fiscal Year-to-date&minorversion=75`,
          {
            headers,
          },
        ),
      ]);

      const metrics = {
        netIncome: findMetricValue(cashFlowReport.data.Rows.Row, 'Net Income'),
        cashFlowReport: cashFlowReport.data,
        profitLossReport: profitLossReport.data,
        salesByProductReport: salesByProductReport.data,
        balanceSheet: balanceSheet.data,
      };

      const processedMetrics = {
        netIncomeCash: findMetricValue(
          metrics.cashFlowReport?.Rows?.Row,
          'Net Income',
        ),
        totalExpensesAccrual: findMetricValue(
          metrics.profitLossReport.Rows.Row,
          'Total Expenses',
        ),
        grossProfit: findMetricValue(
          metrics.profitLossReport.Rows.Row,
          'Gross Profit',
        ),
        netProfitMarginAccrual: calculateNetProfitMargin(
          metrics.profitLossReport,
        ),
        // revenueGrowth: calculateRevenueGrowth(metrics.profitLossReport),
        // customerPaymentsByProduct: extractCustomerPaymentsByProduct(
        //   metrics.salesByProductReport,
        // ),
        balanceByBankAccounts: extractBalanceByBankAccounts(
          metrics.balanceSheet,
        ),
        // salesByProductReport: salesByProductReport.data,
      };

      await this.integrationService.saveRawIntegrationData(
        workspaceIntegration.workspace.id,
        workspaceIntegration.id,
        processedMetrics,
        workspaceIntegration.integration.key,
      );

      await this.integrationService.updateWorkspaceIntegration(
        workspaceIntegration.id,
        {
          lastSynced: new Date().toLocaleString(),
        },
      );
      return processedMetrics;
    } catch (error) {
      this.logger.error(
        'Error fetching QuickBooks metrics:',
        error.response?.data || error.message,
      );
      const quickbooksErrorCode = error.response?.data?.Fault?.Error[0]?.code;
      if (quickbooksErrorCode === '5020') {
        throw new BadRequestException(
          'Permission Denied: The connected QuickBooks account does not have sufficient permissions to view these reports. Please re-authenticate with an admin account.',
        );
      }

      if (quickbooksErrorCode === '3100') {
        throw new BadRequestException(
          'Invalid realmId or authorization. Please re-authenticate.',
        );
      }

      throw new InternalServerErrorException(
        'Failed to fetch QuickBooks metrics.',
      );
    }
  }

  generateAuthUrl(workspaceId: string): string {
    const scopes = 'com.intuit.quickbooks.accounting openid profile email';
    const statePayload = {
      workspaceId,
      integration: 'quick_books',
    };
    const state = Buffer.from(JSON.stringify(statePayload)).toString('base64');

    const url = `https://appcenter.intuit.com/connect/oauth2?client_id=${this.clientId}&redirect_uri=${this.redirectUri}&response_type=code&scope=${scopes}&state=${state}`;
    return url;
  }

  async quickbookCallback(code: string, state: string, realmId: string) {
    try {
      const decoded = getEncodedState(state);
      const { workspaceId, integration } = decoded;
      const response = await this.httpService.axiosRef.post(
        'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: this.redirectUri,
        }),
        {
          auth: {
            username: this.clientId,
            password: this.clientSecret,
          },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
          },
        },
      );
      const { access_token, refresh_token, expires_in } = response.data;

      await this.integrationService.saveOAuthIntegration(
        workspaceId,
        integration,
        {
          accessToken: access_token,
          refreshToken: refresh_token,
          expiresIn: expires_in,
          tokenExpiresAt: Date.now() + expires_in * 1000,
          quickbooksRealmId: realmId,
        },
      );
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException(
        'Failed to process QuickBooks callback',
      );
    }
  }

  private async refreshTokenIfNeeded(
    workspaceId: string,
    workspaceIntegrationId: string,
    authData: IOAuthInfo,
  ): Promise<IOAuthInfo> {
    const now = Date.now();
    const expirationTime = authData.tokenExpiresAt || 0;
    const buffer = 5 * 60 * 1000; // Refresh if token expires in < 5 minutes

    if (expirationTime - now < buffer) {
      this.logger.warn(
        `QuickBooks token for integration ${workspaceIntegrationId} is about to expire. Refreshing...`,
      );

      const release = await this.refreshMutex.acquire();
      try {
        const updatedIntegration =
          await this.integrationService.findWorkspaceIntegrationByWorkspaceId(
            workspaceId,
            workspaceIntegrationId,
          );
        const updatedAuthData = updatedIntegration.authData as IOAuthInfo;

        if (updatedAuthData.tokenExpiresAt - Date.now() > buffer) {
          this.logger.log(
            'QuickBooks token already refreshed by another process.',
          );
          return updatedAuthData;
        }

        const refreshedTokens = await this.refreshQuickBooksToken(
          updatedAuthData.refreshToken,
        );

        updatedAuthData.accessToken = refreshedTokens.access_token;
        updatedAuthData.refreshToken = refreshedTokens.refresh_token; // QuickBooks usually returns a new refresh token
        updatedAuthData.expiresIn = refreshedTokens.expires_in;
        updatedAuthData.tokenExpiresAt =
          Date.now() + refreshedTokens.expires_in * 1000;

        await this.integrationService.updateOAuthTokens(
          workspaceIntegrationId,
          updatedAuthData,
        );

        this.logger.log('Successfully refreshed QuickBooks access token.');
        return updatedAuthData;
      } catch (error) {
        this.logger.error(
          'Error refreshing QuickBooks access token:',
          error.response?.data || error.message,
        );
        throw new BadRequestException(
          'Failed to refresh QuickBooks token. Please re-authenticate.',
        );
      } finally {
        release();
      }
    }

    return authData;
  }

  private async refreshQuickBooksToken(refreshToken: string) {
    try {
      const response = await this.httpService.axiosRef.post(
        'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
        {
          auth: {
            username: this.clientId,
            password: this.clientSecret,
          },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
          },
        },
      );
      return response.data;
    } catch (error) {
      this.logger.error(
        'Error in refreshQuickBooksToken:',
        error.response?.data || error.message,
      );
      throw error;
    }
  }
}
