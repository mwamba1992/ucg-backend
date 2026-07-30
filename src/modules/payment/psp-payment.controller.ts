import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { ReferenceService } from '../reference/reference.service';
import { ApefClientService } from '../apef/apef-client.service';
import { PspApiAuthGuard } from '../auth/guards/psp-api-auth.guard';
import { CreatePaymentDto } from './dto/payment.dto';
import { PaymentOption, ReferenceStatus } from '../reference/entities/payment-reference.entity';

/**
 * PSP Payment Controller
 *
 * API endpoints for Payment Service Providers (PSP) to:
 * - Submit payments on behalf of customers
 * - Verify payment references
 * - Check payment status
 *
 * Authentication: API Key (Bearer token)
 */
@ApiTags('PSP - Payment APIs')
@Controller('psp')
@UseGuards(PspApiAuthGuard)
@ApiBearerAuth('PSP-API-Key')
export class PspPaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly referenceService: ReferenceService,
    private readonly apefClientService: ApefClientService,
  ) {}

  /**
   * Submit a payment for a reference
   * PSP API endpoint for third-party systems to process payments
   */
  @Post('payments')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Submit payment (PSP API)',
    description: 'Third-party payment service providers can submit payments using their API key',
  })
  @ApiResponse({
    status: 201,
    description: 'Payment processed successfully',
    schema: {
      example: {
        success: true,
        message: 'Payment processed successfully',
        data: {
          id: 'payment-uuid',
          referenceNumber: 'HO1-0000001-123',
          amountPaid: 50000,
          payerName: 'John Doe',
          payerPhone: '+255712345678',
          paymentChannel: 'MPESA',
          fspCode: 'VODACOM',
          status: 'SUCCESS',
          paidAt: '2026-01-21T10:30:00Z',
          transactionId: 'TXN123456',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid reference, amount, or payment validation failed',
    schema: {
      example: {
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Payment not allowed: Amount must be exactly 50000 for PRECISE payment option',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing API key',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - PSP user not authorized to use this FSP',
  })
  async createPayment(@Body() createPaymentDto: CreatePaymentDto, @Req() request: any) {
    try {
      // Pass PSP user for FSP authorization validation
      const pspUser = request.user;
      const payment = await this.paymentService.createPayment(createPaymentDto, pspUser);

      return {
        success: true,
        message: 'Payment processed successfully',
        data: {
          id: payment.id,
          referenceNumber: payment.referenceNumber,
          amountPaid: payment.amountPaid,
          payerName: payment.payerName,
          payerPhone: payment.payerPhone,
          paymentChannel: payment.paymentChannel,
          fspCode: payment.fspCode,
          status: payment.status,
          paidAt: payment.paidAt,
          currency: payment.currency,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PAYMENT_FAILED',
          message: error.message,
        },
      };
    }
  }

  /**
   * Get reference details by reference number
   * Allows PSP to verify reference before processing payment
   */
  @Get('references/:referenceNumber')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get reference details (PSP API)',
    description:
      'Retrieve payment reference details to verify before submitting payment. ' +
      'Details are only returned for references that can still be paid: expired, ' +
      'cancelled, used and fully-paid references return an error instead. Use ' +
      'GET /psp/payments/reference/{referenceNumber} to look up a settled reference.',
  })
  @ApiParam({
    name: 'referenceNumber',
    description: 'Payment reference number',
    example: 'HO1-0000001-123',
  })
  @ApiResponse({
    status: 200,
    description:
      'Details are returned only for a payable reference. A reference that exists but is ' +
      'expired, cancelled, used or fully paid returns success=false with an error code ' +
      'and no details.',
    content: {
      'application/json': {
        examples: {
          payable: {
            summary: 'Reference is payable',
            value: {
              success: true,
              data: {
                referenceNumber: 'HO1-0000001-123',
                amount: 50000,
                totalPaid: 0,
                remainingAmount: 50000,
                currency: 'TZS',
                paymentOption: 'COMPLETE',
                status: 'ACTIVE',
                customerName: 'John Doe',
                customerPhone: '+255712345678',
                description: 'School fees payment',
                expiryDate: '2026-12-31T23:59:59Z',
                serviceProvider: {
                  spCode: 'HO1',
                  businessName: 'Hope International School',
                  email: 'accounts@hopeschool.com',
                  phoneNumber: '+255754321098',
                  primaryBankAccount: {
                    bankName: 'CRDB Bank',
                    accountNumber: '0123456789',
                    accountName: 'Hope International School',
                    branchName: 'Dar es Salaam',
                  },
                },
              },
            },
          },
          expired: {
            summary:
              'Reference expired (also: REFERENCE_CANCELLED, REFERENCE_USED, ' +
              'REFERENCE_FULLY_PAID)',
            value: {
              success: false,
              error: {
                code: 'REFERENCE_EXPIRED',
                message:
                  'This reference number has expired and can no longer be used for payment.',
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Reference not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing API key',
  })
  async getReferenceDetails(@Param('referenceNumber') referenceNumber: string) {
    try {
      // Route APEF references (starting with 001 or 002) to APEF API
      if (referenceNumber.startsWith('001') || referenceNumber.startsWith('002')) {
        const apefResult = await this.apefClientService.validateAccount(referenceNumber);

        if (!apefResult.success) {
          return {
            success: false,
            error: {
              code: 'APEF_VALIDATION_FAILED',
              message: apefResult.errorMessage || 'APEF reference validation failed',
            },
          };
        }

        return {
          success: true,
          data: {
            referenceNumber,
            source: 'APEF',
            ...apefResult.rawResponse,
          },
        };
      }

      const reference = await this.referenceService.findByReferenceNumber(referenceNumber);

      if (!reference) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Payment reference not found',
          },
        };
      }

      // Withhold details for references that can no longer be paid, consistent
      // with the telco channels (Airtel billfetch/lookup). Without this a PSP
      // could read customer and bank details off an expired or cancelled bill.
      if (!reference.isValid()) {
        return {
          success: false,
          error: this.referenceUnavailableError(reference),
        };
      }

      // PERPETUAL references accept payments indefinitely, so being "fully paid"
      // never closes them. Any other reference that is settled is done.
      if (reference.isFullyPaid() && reference.paymentOption !== PaymentOption.PERPETUAL) {
        return {
          success: false,
          error: {
            code: 'REFERENCE_FULLY_PAID',
            message: 'This reference number has already been fully paid.',
          },
        };
      }

      // Return formatted reference data using existing toResponseDto method
      const responseData = this.referenceService.toResponseDto(reference);

      return {
        success: true,
        data: responseData,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'ERROR',
          message: error.message,
        },
      };
    }
  }

  /**
   * Get payment summary for a reference
   * Returns all payments made against a reference
   */
  @Get('payments/reference/:referenceNumber')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get payment summary (PSP API)',
    description: 'Retrieve payment history and summary for a reference number',
  })
  @ApiParam({
    name: 'referenceNumber',
    description: 'Payment reference number',
    example: 'HO1-0000001-123',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment summary retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          referenceNumber: 'HO1-0000001-123',
          invoiceAmount: 50000,
          totalPaid: 50000,
          remainingAmount: 0,
          installmentCount: 1,
          paymentOption: 'COMPLETE',
          isFullyPaid: true,
          status: 'USED',
          payments: [
            {
              id: 'payment-uuid',
              amountPaid: 50000,
              payerName: 'John Doe',
              paymentChannel: 'MPESA',
              fspCode: 'VODACOM',
              paidAt: '2026-01-21T10:30:00Z',
              status: 'SUCCESS',
            },
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Reference not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing API key',
  })
  async getPaymentSummary(@Param('referenceNumber') referenceNumber: string) {
    try {
      const summary = await this.paymentService.getPaymentSummary(referenceNumber);

      return {
        success: true,
        data: summary,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'ERROR',
          message: error.message,
        },
      };
    }
  }

  /**
   * Build the error returned when a reference exists but cannot be paid.
   * Mirrors the telco channels' reasons so PSPs can branch on the code.
   * Expiry is checked first: a reference past its expiry date is reported as
   * expired even if its stored status is still ACTIVE (auto-expiry is lazy).
   */
  private referenceUnavailableError(reference: any): {
    code: string;
    message: string;
  } {
    if (reference.isExpired()) {
      return {
        code: 'REFERENCE_EXPIRED',
        message: 'This reference number has expired and can no longer be used for payment.',
      };
    }
    if (reference.status === ReferenceStatus.CANCELLED) {
      return {
        code: 'REFERENCE_CANCELLED',
        message: 'This reference number has been cancelled and cannot be used for payment.',
      };
    }
    if (reference.status === ReferenceStatus.USED) {
      return {
        code: 'REFERENCE_USED',
        message: 'This reference number has already been used.',
      };
    }
    return {
      code: 'REFERENCE_NOT_VALID',
      message: 'This reference number is not valid for payment.',
    };
  }
}
