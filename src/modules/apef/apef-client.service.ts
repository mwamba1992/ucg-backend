import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  ApefValidateAccountResponseDto,
  ApefDepositNotificationRequestDto,
  ApefDepositNotificationResponseDto,
} from './dto/apef.dto';

interface CachedToken {
  token: string;
  bankCode: string;
  bankName: string;
  expiresAt: number; // Timestamp in milliseconds
}

@Injectable()
export class ApefClientService {
  private readonly logger = new Logger(ApefClientService.name);
  private readonly apefBaseUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;

  // Token cache
  private cachedToken: CachedToken | null = null;
  private readonly TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000; // 5 minutes buffer before expiry

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apefBaseUrl = this.configService.get<string>('APEF_API_URL', 'https://uatapi.apef.co.tz');
    this.clientId = this.configService.get<string>('APEF_CLIENT_ID');
    this.clientSecret = this.configService.get<string>('APEF_CLIENT_SECRET');
  }

  /**
   * Get APEF authentication token (with caching)
   */
  async getToken(): Promise<{ token: string; bankCode: string; bankName: string }> {
    // Check if cached token is still valid
    if (this.cachedToken && Date.now() < this.cachedToken.expiresAt) {
      this.logger.debug('Using cached APEF token');
      return {
        token: this.cachedToken.token,
        bankCode: this.cachedToken.bankCode,
        bankName: this.cachedToken.bankName,
      };
    }

    this.logger.log('Fetching new APEF token');

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.apefBaseUrl}/api/banks/login`,
          {
            clientId: this.clientId,
            clientSecret: this.clientSecret,
          },
          {
            headers: {
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      this.logger.debug(`APEF login response: ${JSON.stringify(response.data)}`);

      const { token, bankCode, bankName } = response.data;

      if (!token) {
        this.logger.error('APEF login response did not contain a token');
        throw new Error('APEF login response missing token');
      }

      // Cache token with 55 minute expiry (assuming 1 hour token validity)
      this.cachedToken = {
        token,
        bankCode,
        bankName,
        expiresAt: Date.now() + (55 * 60 * 1000), // 55 minutes
      };

      this.logger.log(`APEF token obtained successfully. Bank: ${bankName} (${bankCode}), Token length: ${token.length}`);

      return { token, bankCode, bankName };
    } catch (error) {
      this.logger.error(`Failed to obtain APEF token: ${error.message}`);
      if (error.response) {
        this.logger.error(`APEF login error response: ${JSON.stringify(error.response.data)}`);
      }
      throw new Error(`APEF authentication failed: ${error.message}`);
    }
  }

  /**
   * Validate APEF reference/account number
   */
  async validateAccount(apefAccountNumber: string, retryOnAuthFailure = true): Promise<ApefValidateAccountResponseDto> {
    this.logger.log(`Validating APEF account: ${apefAccountNumber}`);

    try {
      const { token } = await this.getToken();

      this.logger.log(`APEF validation using token: ${token}`);

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.apefBaseUrl}/api/banks/validate-account`,
          {
            apefAccountNumber,
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
          },
        ),
      );

      this.logger.log(`APEF validation response: ${JSON.stringify(response.data)}`);

      // Parse response - adjust based on actual APEF API response structure
      const data = response.data;

      // APEF returns investorName / paymentDescription / minAmount. The older
      // generic key guesses below never matched, so customerName and amount
      // were silently stored as NULL on every reference.
      return {
        success: true,
        customerName:
          data.investorName || data.customerName || data.accountName || data.name,
        amount: data.amount ?? data.billAmount,
        minAmount: data.minAmount,
        collectionAccount: data.collectionAccount,
        currency: data.currency || 'TZS',
        billDescription:
          data.paymentDescription || data.billDescription || data.description,
        rawResponse: data,
      };
    } catch (error) {
      this.logger.error(`APEF validation failed for ${apefAccountNumber}: ${error.message}`);
      if (error.response) {
        this.logger.error(`APEF validation error response: ${JSON.stringify(error.response.data)}`);
      }

      // If 401 error and we haven't retried yet, clear cache and retry with fresh token
      if (error.response?.status === 401 && retryOnAuthFailure) {
        this.logger.warn('APEF token invalid, clearing cache and retrying with fresh token');
        this.clearTokenCache();
        return this.validateAccount(apefAccountNumber, false);
      }

      return {
        success: false,
        errorMessage: error.response?.data?.message || error.message,
        rawResponse: error.response?.data,
      };
    }
  }

  /**
   * Send deposit notification to APEF
   */
  async sendDepositNotification(
    request: ApefDepositNotificationRequestDto,
    retryOnAuthFailure = true,
  ): Promise<ApefDepositNotificationResponseDto> {
    this.logger.log(
      `Sending APEF deposit notification for reference: ${request.apefAccountNumber}, ` +
      `txn: ${request.transactionReference}, amount: ${request.amount}`,
    );

    try {
      const { token } = await this.getToken();

      this.logger.log(`APEF deposit using token: ${token}`);
      this.logger.log(`APEF deposit payload: ${JSON.stringify(request)}`);

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.apefBaseUrl}/api/banks/transactions/deposit`,
          request,
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
          },
        ),
      );

      this.logger.log(`APEF deposit notification response: ${JSON.stringify(response.data)}`);

      return {
        success: true,
        message: response.data.message || 'Deposit notification sent successfully',
        rawResponse: response.data,
      };
    } catch (error) {
      this.logger.error(
        `APEF deposit notification failed for ${request.apefAccountNumber}: ${error.message}`,
      );
      if (error.response) {
        this.logger.error(`APEF deposit error response: ${JSON.stringify(error.response.data)}`);
      }

      // If 401 error and we haven't retried yet, clear cache and retry with fresh token
      if (error.response?.status === 401 && retryOnAuthFailure) {
        this.logger.warn('APEF token invalid, clearing cache and retrying with fresh token');
        this.clearTokenCache();
        return this.sendDepositNotification(request, false);
      }

      return {
        success: false,
        errorMessage: error.response?.data?.message || error.message,
        rawResponse: error.response?.data,
      };
    }
  }

  /**
   * Get bank code from cached token
   */
  getBankCode(): string | null {
    return this.cachedToken?.bankCode || null;
  }

  /**
   * Get bank name from cached token
   */
  getBankName(): string | null {
    return this.cachedToken?.bankName || null;
  }

  /**
   * Clear cached token (useful for testing or forced refresh)
   */
  clearTokenCache(): void {
    this.cachedToken = null;
    this.logger.log('APEF token cache cleared');
  }
}
