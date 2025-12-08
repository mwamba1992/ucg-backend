import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import { CBSTransfer, TransferStatus, TransferType } from './entities/cbs-transfer.entity';
import { CreateTransferDto, TransferResponseDto } from './dto/transfer.dto';

export interface TransferResult {
  success: boolean;
  transferId?: string;
  cbsReference?: string;
  statusCode?: string;
  statusDescription?: string;
  error?: string;
}

@Injectable()
export class CBSService {
  private readonly logger = new Logger(CBSService.name);
  private readonly cbsApiUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @InjectRepository(CBSTransfer)
    private readonly transferRepo: Repository<CBSTransfer>,
  ) {
    this.cbsApiUrl = this.configService.get<string>('CBS_API_URL');
  }

  /**
   * Execute fund transfer to CBS
   */
  async executeTransfer(
    dto: CreateTransferDto,
    paymentId?: string,
  ): Promise<TransferResult> {
    // Create transfer record
    const transfer = this.transferRepo.create({
      paymentId,
      reference: dto.reference,
      creditAccount: dto.creditAccount,
      debitAccount: dto.debitAccount,
      currency: dto.currency,
      amount: dto.amount,
      description: dto.description,
      type: dto.type,
      status: TransferStatus.PENDING,
    });

    const savedTransfer = await this.transferRepo.save(transfer);

    try {
      if (!this.cbsApiUrl) {
        this.logger.warn('CBS API URL not configured');
        return {
          success: false,
          transferId: savedTransfer.id,
          error: 'CBS API not configured',
        };
      }

      this.logger.log(
        `Executing CBS transfer: ${dto.type} - ${dto.amount} ${dto.currency} ` +
        `from ${dto.debitAccount} to ${dto.creditAccount}`,
      );

      // Call CBS API
      const response = await firstValueFrom(
        this.httpService.post<TransferResponseDto>(
          `${this.cbsApiUrl}/G2D`,
          {
            reference: dto.reference,
            creditAccount: dto.creditAccount,
            debitAccount: dto.debitAccount,
            currency: dto.currency,
            amount: dto.amount,
            description: dto.description,
            type: dto.type,
          },
        ),
      );

      // Check CBS response
      if (response.data.statusCode === '6200') {
        // Update transfer as successful
        savedTransfer.status = TransferStatus.SUCCESS;
        savedTransfer.cbsResponseCode = response.data.statusCode;
        savedTransfer.cbsResponseMessage = response.data.statusDescription;
        savedTransfer.cbsResponse = response.data.response;
        savedTransfer.completedAt = new Date();

        await this.transferRepo.save(savedTransfer);

        this.logger.log(
          `CBS transfer successful: ${response.data.response.reference} - ${response.data.statusDescription}`,
        );

        return {
          success: true,
          transferId: savedTransfer.id,
          cbsReference: response.data.response.reference,
          statusCode: response.data.statusCode,
          statusDescription: response.data.statusDescription,
        };
      } else {
        // Transfer failed
        savedTransfer.status = TransferStatus.FAILED;
        savedTransfer.cbsResponseCode = response.data.statusCode;
        savedTransfer.cbsResponseMessage = response.data.statusDescription;
        savedTransfer.errorMessage = `CBS returned non-success code: ${response.data.statusCode}`;

        await this.transferRepo.save(savedTransfer);

        this.logger.warn(
          `CBS transfer failed: ${response.data.statusCode} - ${response.data.statusDescription}`,
        );

        return {
          success: false,
          transferId: savedTransfer.id,
          statusCode: response.data.statusCode,
          statusDescription: response.data.statusDescription,
          error: response.data.statusDescription,
        };
      }
    } catch (error) {
      // Handle errors
      savedTransfer.status = TransferStatus.FAILED;
      savedTransfer.errorMessage = error.message;
      await this.transferRepo.save(savedTransfer);

      this.logger.error(
        `CBS transfer failed: ${error.message}`,
        error.stack,
      );

      return {
        success: false,
        transferId: savedTransfer.id,
        error: error.message,
      };
    }
  }

  /**
   * Retry failed transfer
   */
  async retryTransfer(transferId: string): Promise<TransferResult> {
    const transfer = await this.transferRepo.findOne({
      where: { id: transferId },
    });

    if (!transfer) {
      throw new Error('Transfer not found');
    }

    if (transfer.status === TransferStatus.SUCCESS) {
      return {
        success: true,
        transferId: transfer.id,
        cbsReference: transfer.cbsResponse?.reference,
        statusCode: transfer.cbsResponseCode,
        statusDescription: transfer.cbsResponseMessage,
      };
    }

    // Increment retry count
    transfer.retryCount += 1;
    transfer.status = TransferStatus.PENDING;
    await this.transferRepo.save(transfer);

    // Execute transfer again
    return this.executeTransfer({
      reference: transfer.reference,
      creditAccount: transfer.creditAccount,
      debitAccount: transfer.debitAccount,
      currency: transfer.currency,
      amount: Number(transfer.amount),
      description: transfer.description,
      type: transfer.type,
    }, transfer.paymentId);
  }

  /**
   * Get transfer by ID
   */
  async getTransfer(transferId: string): Promise<CBSTransfer> {
    return this.transferRepo.findOne({
      where: { id: transferId },
    });
  }

  /**
   * Get transfers by payment ID
   */
  async getTransfersByPayment(paymentId: string): Promise<CBSTransfer[]> {
    return this.transferRepo.find({
      where: { paymentId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get failed transfers for retry
   */
  async getFailedTransfers(limit: number = 100): Promise<CBSTransfer[]> {
    return this.transferRepo.find({
      where: { status: TransferStatus.FAILED },
      order: { createdAt: 'ASC' },
      take: limit,
    });
  }

  /**
   * Calculate commission/fees
   */
  calculateCommission(amount: number, commissionRate: number): number {
    return (Number(amount) * Number(commissionRate)) / 100;
  }

  /**
   * Build transfer for payment settlement
   * Transfers payment amount minus commission to service provider's account
   */
  buildSettlementTransfer(
    referenceNumber: string,
    spDepositAccount: string,
    ucgGLAccount: string,
    grossAmount: number,
    commissionRate: number,
    currency: string = 'TZS',
  ): CreateTransferDto {
    const commission = this.calculateCommission(grossAmount, commissionRate);
    const netAmount = Number(grossAmount) - commission;

    return {
      reference: referenceNumber,
      creditAccount: spDepositAccount, // Service provider's account
      debitAccount: ucgGLAccount, // UCG GL account
      currency,
      amount: netAmount,
      description: `Settlement for ${referenceNumber} (Amount: ${grossAmount}, Commission: ${commission})`,
      type: TransferType.GL_TO_DEPOSIT,
    };
  }
}
