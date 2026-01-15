import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole } from '../user/entities/user.entity';
import { TigoPesaService } from './tigopesa.service';
import { TigoPesaProducer } from './tigopesa.producer';
import {
  TigoPesaBillPayResponseDto,
  TigoPesaErrorCode,
  TigoPesaResult,
} from './dto/tigopesa-notification.dto';
import { TigoPesaPaymentMessage } from './dto/tigopesa-queue.dto';

@ApiTags('Mixx')
@Controller('mixx')
export class TigoPesaController {
  private readonly logger = new Logger(TigoPesaController.name);

  constructor(
    private readonly tigopesaService: TigoPesaService,
    private readonly tigopesaProducer: TigoPesaProducer,
  ) {}

  /**
   * PUBLIC ENDPOINT: Mixx TigoPesa Transaction Webhook
   * This endpoint receives payment notifications from Mixx (TigoPesa)
   * Processes synchronously for immediate response with actual result
   * Falls back to async queue processing if sync processing fails
   */
  @Public()
  @Post('transaction')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Receive Mixx TigoPesa transaction notification',
    description: 'Public webhook endpoint for Mixx TigoPesa payment notifications. Processes synchronously with fallback to async queue.',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment notification received successfully',
    content: {
      'application/xml': {
        schema: {
          type: 'string',
          example: `<?xml version="1.0"?>
<COMMAND>
  <TYPE>SYNC_BILLPAY_RESPONSE</TYPE>
  <TXNID>BP140218.1240.B01530</TXNID>
  <REFID>TG1234567890ABCD</REFID>
  <RESULT>TS</RESULT>
  <ERRORCODE>error000</ERRORCODE>
  <ERRORDESC></ERRORDESC>
  <MSISDN>0714405395</MSISDN>
  <FLAG>Y</FLAG>
  <CONTENT>Payment received successfully.</CONTENT>
</COMMAND>`,
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid notification format' })
  async receiveBillPayment(@Body() xmlBody: string): Promise<string> {
    const startTime = Date.now();

    try {
      this.logger.log('📥 ========== TIGOPESA INCOMING REQUEST ==========');
      this.logger.log(`📥 Raw XML Request:\n${xmlBody}`);

      // Parse XML notification
      const notification = await this.tigopesaService.parseXmlNotification(xmlBody);

      this.logger.log(
        `TigoPesa notification: ${notification.TXNID} - Amount: ${notification.AMOUNT} - Reference: ${notification.CUSTOMERREFERENCEID}`,
      );

      // Validate notification format
      this.tigopesaService.validateNotificationFormat(notification);

      // Check for duplicate
      const isDuplicate = await this.tigopesaService.checkDuplicate(notification.TXNID);

      if (isDuplicate) {
        this.logger.warn(`Duplicate TigoPesa notification: ${notification.TXNID}`);

        // Return success response for duplicate (already processed)
        const response: TigoPesaBillPayResponseDto = {
          TYPE: 'SYNC_BILLPAY_RESPONSE',
          TXNID: notification.TXNID,
          REFID: 'DUPLICATE',
          RESULT: TigoPesaResult.SUCCESS,
          ERRORCODE: TigoPesaErrorCode.SUCCESS,
          ERRORDESC: '',
          MSISDN: notification.MSISDN,
          FLAG: 'N',
          CONTENT: 'Transaction already processed',
        };

        const responseTime = Date.now() - startTime;
        this.logger.log(`TigoPesa webhook response time: ${responseTime}ms (duplicate)`);

        const xmlResponse = this.tigopesaService.buildResponseXml(response);
        this.logger.log('📤 ========== TIGOPESA OUTGOING RESPONSE (DUPLICATE) ==========');
        this.logger.log(`📤 XML Response:\n${xmlResponse}`);
        this.logger.log(`📤 Response Time: ${responseTime}ms`);

        return xmlResponse;
      }

      // Create transaction record
      await this.tigopesaService.createTransaction(notification);

      // Process payment synchronously
      this.logger.log(`Processing TigoPesa payment synchronously: ${notification.TXNID}`);

      const message: TigoPesaPaymentMessage = {
        txnId: notification.TXNID,
        msisdn: notification.MSISDN,
        amount: notification.AMOUNT,
        companyName: notification.COMPANYNAME,
        customerReferenceId: notification.CUSTOMERREFERENCEID,
        senderName: notification.SENDERNAME,
      };

      const processingResult = await this.tigopesaService.processPayment(message);

      let response: TigoPesaBillPayResponseDto;

      if (processingResult.success) {
        // Success response with actual REFID
        response = {
          TYPE: 'SYNC_BILLPAY_RESPONSE',
          TXNID: notification.TXNID,
          REFID: processingResult.refId,
          RESULT: TigoPesaResult.SUCCESS,
          ERRORCODE: TigoPesaErrorCode.SUCCESS,
          ERRORDESC: '',
          MSISDN: notification.MSISDN,
          FLAG: 'Y',
          CONTENT: 'Payment processed successfully',
        };

        this.logger.log(
          `TigoPesa payment processed successfully: ${notification.TXNID} - REFID: ${processingResult.refId}`,
        );
      } else {
        // Validation or processing error - return specific error
        response = {
          TYPE: 'SYNC_BILLPAY_RESPONSE',
          TXNID: notification.TXNID,
          REFID: 'ERROR',
          RESULT: TigoPesaResult.FAILURE,
          ERRORCODE: processingResult.errorCode || TigoPesaErrorCode.GENERAL_ERROR,
          ERRORDESC: processingResult.errorDescription || 'Payment processing failed',
          MSISDN: notification.MSISDN,
          FLAG: 'N',
        };

        this.logger.warn(
          `TigoPesa payment failed: ${notification.TXNID} - ${processingResult.errorDescription}`,
        );
      }

      const responseTime = Date.now() - startTime;
      this.logger.log(`TigoPesa webhook response time: ${responseTime}ms`);

      const xmlResponse = this.tigopesaService.buildResponseXml(response);
      this.logger.log(`📤 ========== TIGOPESA OUTGOING RESPONSE (${response.RESULT === TigoPesaResult.SUCCESS ? 'SUCCESS' : 'FAILURE'}) ==========`);
      this.logger.log(`📤 XML Response:\n${xmlResponse}`);
      this.logger.log(`📤 Response Time: ${responseTime}ms`);
      this.logger.log(`📤 RESULT: ${response.RESULT} | ERRORCODE: ${response.ERRORCODE}`);

      return xmlResponse;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.logger.error(
        `TigoPesa webhook error (${responseTime}ms): ${error.message}`,
        error.stack,
      );

      // Return error response
      const errorResponse: TigoPesaBillPayResponseDto = {
        TYPE: 'SYNC_BILLPAY_RESPONSE',
        TXNID: 'ERROR',
        REFID: 'ERROR',
        RESULT: TigoPesaResult.FAILURE,
        ERRORCODE: TigoPesaErrorCode.GENERAL_ERROR,
        ERRORDESC: error.message,
        MSISDN: '',
        FLAG: 'N',
      };

      const xmlErrorResponse = this.tigopesaService.buildResponseXml(errorResponse);
      this.logger.error('📤 ========== TIGOPESA OUTGOING RESPONSE (ERROR) ==========');
      this.logger.error(`📤 XML Response:\n${xmlErrorResponse}`);
      this.logger.error(`📤 Response Time: ${responseTime}ms`);
      this.logger.error(`📤 Error: ${error.message}`);

      return xmlErrorResponse;
    }
  }

  /**
   * PROTECTED: Get all TigoPesa transactions
   */
  @Get('transactions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all TigoPesa transactions' })
  @ApiResponse({ status: 200, description: 'Transactions retrieved successfully' })
  async getTransactions(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('status') status?: string,
    @Query('referenceNumber') referenceNumber?: string,
  ) {
    return {
      message: 'TigoPesa transactions endpoint',
      page,
      limit,
      status,
      referenceNumber,
    };
  }

  /**
   * PROTECTED: Get specific TigoPesa transaction
   */
  @Get('transactions/:txnId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get TigoPesa transaction by transaction ID' })
  @ApiResponse({ status: 200, description: 'Transaction retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async getTransaction(@Param('txnId') txnId: string) {
    const transaction = await this.tigopesaService.getTransaction(txnId);

    if (!transaction) {
      throw new BadRequestException('Transaction not found');
    }

    return {
      transaction,
    };
  }

  /**
   * PROTECTED: Retry failed TigoPesa transaction
   */
  @Post('transactions/:txnId/retry')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retry failed TigoPesa transaction' })
  @ApiResponse({ status: 200, description: 'Transaction retry initiated' })
  @ApiResponse({ status: 400, description: 'Transaction cannot be retried' })
  async retryTransaction(@Param('txnId') txnId: string) {
    const result = await this.tigopesaService.retryTransaction(txnId);

    return {
      message: 'Transaction retry completed',
      ...result,
    };
  }

  /**
   * PROTECTED: Get TigoPesa configuration
   */
  @Get('config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get TigoPesa configuration' })
  @ApiResponse({ status: 200, description: 'Configuration retrieved successfully' })
  async getConfig() {
    const config = await this.tigopesaService.getTigoPesaConfig();

    return {
      companyName: config.companyName,
      webhookUrl: config.webhookUrl,
      isActive: config.isActive,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }

  /**
   * PROTECTED: Get TigoPesa statistics
   */
  @Get('statistics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get TigoPesa statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStatistics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    const statistics = await this.tigopesaService.getStatistics(start, end);

    return {
      statistics,
    };
  }
}
