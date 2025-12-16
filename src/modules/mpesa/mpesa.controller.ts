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
  Req,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole } from '../user/entities/user.entity';
import { MpesaService } from './mpesa.service';
import { MpesaProducer } from './mpesa.producer';
import { MpesaPaymentMessage } from './dto/mpesa-queue.dto';

@ApiTags('M-Pesa')
@Controller('mpesa')
export class MpesaController {
  private readonly logger = new Logger(MpesaController.name);

  constructor(
    private readonly mpesaService: MpesaService,
    private readonly mpesaProducer: MpesaProducer,
  ) {}

  /**
   * PUBLIC ENDPOINT: M-Pesa C2B Payment Notification Webhook
   * This endpoint receives payment notifications from M-Pesa
   * MUST respond within 2 seconds
   */
  @Public()
  @Post('c2b/payment')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Receive M-Pesa C2B payment notification',
    description: 'Public webhook endpoint for M-Pesa payment notifications. Responds immediately and queues for async processing.',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment notification received successfully',
    content: {
      'application/xml': {
        schema: {
          type: 'string',
          example: `<?xml version="1.0"?>
<response>
  <conversationID>12345</conversationID>
  <originatorConversationID>67890</originatorConversationID>
  <transactionID>ABC123</transactionID>
  <responseCode>0</responseCode>
  <responseDesc>Received</responseDesc>
  <serviceStatus>Success</serviceStatus>
</response>`,
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid notification format' })
  async receivePaymentNotification(@Body() xmlBody: string, @Req() req: any): Promise<string> {
    const startTime = Date.now();

    try {
      this.logger.log('M-Pesa C2B payment notification received');

      // Parse XML notification
      const notification = await this.mpesaService.parseXmlNotification(xmlBody);

      this.logger.log(
        `M-Pesa notification: ${notification.mpesaReceipt} - Amount: ${notification.amount} - Reference: ${notification.accountReference}`,
      );

      // Validate notification format
      this.mpesaService.validateNotificationFormat(notification);

      // Verify password
      const passwordValid = await this.mpesaService.verifyPassword(
        notification.spId,
        notification.spPassword,
        notification.timestamp,
      );

      if (!passwordValid) {
        this.logger.error('M-Pesa password verification failed');
        throw new BadRequestException('Invalid password');
      }

      // Check for duplicate
      const isDuplicate = await this.mpesaService.checkDuplicate(notification.mpesaReceipt);

      if (isDuplicate) {
        this.logger.warn(`Duplicate M-Pesa notification: ${notification.mpesaReceipt}`);
        await this.mpesaService.handleDuplicate(notification);
      } else {
        // Create transaction record
        await this.mpesaService.createTransaction(notification);

        // Queue for async processing (fire-and-forget)
        const message: MpesaPaymentMessage = {
          mpesaReceipt: notification.mpesaReceipt,
          conversationId: notification.conversationID,
          originatorConversationId: notification.originatorConversationID,
          transactionId: notification.transactionID,
          referenceNumber: notification.accountReference,
          amount: notification.amount,
          customerPhone: notification.initiator,
          customerName: null,
          commandId: notification.commandID,
          transactionDate: notification.transactionDate,
        };

        this.mpesaProducer.emitPaymentProcessing(message);

        this.logger.log(`M-Pesa payment queued for processing: ${notification.mpesaReceipt}`);
      }

      // Build and return sync success response (XML)
      const syncResponse = this.mpesaService.buildSyncSuccessResponse(
        notification.conversationID,
        notification.originatorConversationID,
        notification.transactionID,
      );

      const responseTime = Date.now() - startTime;
      this.logger.log(`M-Pesa webhook response time: ${responseTime}ms`);

      return syncResponse;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.logger.error(
        `M-Pesa webhook error (${responseTime}ms): ${error.message}`,
        error.stack,
      );

      // Still need to respond quickly even on error
      throw error;
    }
  }

  /**
   * PROTECTED: Get all M-Pesa transactions
   */
  @Get('transactions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all M-Pesa transactions' })
  @ApiResponse({ status: 200, description: 'Transactions retrieved successfully' })
  async getTransactions(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('status') status?: string,
    @Query('referenceNumber') referenceNumber?: string,
  ) {
    // Implementation would include pagination and filtering
    return {
      message: 'M-Pesa transactions endpoint',
      page,
      limit,
      status,
      referenceNumber,
    };
  }

  /**
   * PROTECTED: Get specific M-Pesa transaction
   */
  @Get('transactions/:mpesaReceipt')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get M-Pesa transaction by receipt number' })
  @ApiResponse({ status: 200, description: 'Transaction retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async getTransaction(@Param('mpesaReceipt') mpesaReceipt: string) {
    const transaction = await this.mpesaService.getTransaction(mpesaReceipt);

    if (!transaction) {
      throw new BadRequestException('Transaction not found');
    }

    return {
      transaction,
    };
  }

  /**
   * PROTECTED: Retry failed M-Pesa transaction
   */
  @Post('transactions/:mpesaReceipt/retry')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retry failed M-Pesa transaction' })
  @ApiResponse({ status: 200, description: 'Transaction retry initiated' })
  @ApiResponse({ status: 400, description: 'Transaction cannot be retried' })
  async retryTransaction(@Param('mpesaReceipt') mpesaReceipt: string) {
    const result = await this.mpesaService.retryTransaction(mpesaReceipt);

    return {
      message: 'Transaction retry initiated',
      ...result,
    };
  }

  /**
   * PROTECTED: Get M-Pesa configuration
   */
  @Get('config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get M-Pesa configuration' })
  @ApiResponse({ status: 200, description: 'Configuration retrieved successfully' })
  async getConfig() {
    const config = await this.mpesaService.getMpesaConfig();

    // Mask sensitive information
    return {
      spId: config.spId,
      initiator: config.initiator,
      callbackUrl: config.callbackUrl,
      isActive: config.isActive,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
      // Don't expose passwords
    };
  }

  /**
   * PROTECTED: Get M-Pesa statistics
   */
  @Get('statistics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get M-Pesa statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStatistics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    const statistics = await this.mpesaService.getStatistics(start, end);

    return {
      statistics,
    };
  }
}
